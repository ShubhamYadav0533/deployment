const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const config = require("./config");
const logger = require("./utils/logger");
const Deployment = require("./models/Deployment");
const dockerService = require("./services/dockerService");
const lambdaService = require("./services/lambdaService");

/**
 * Deployment Worker
 * Listens to the BullMQ "deployments" queue and processes deployment jobs.
 * 
 * Flow:
 * 1. Update status to "Pulling Image"
 * 2. Deploy Docker container on EC2 (SSH or SSM)
 * 3. Update status to "Invoking Lambda"
 * 4. Trigger AWS Lambda for post-deployment setup
 * 5. Update status to "Completed" or "Failed"
 */

async function updateDeployment(deploymentId, updates) {
  return Deployment.findByIdAndUpdate(deploymentId, updates, { new: true });
}

const worker = new Worker(
  "deployments",
  async (job) => {
    const { deploymentId, clientName, domain, image } = job.data;
    logger.info(`[Worker] Processing job: ${job.id} | Deployment: ${deploymentId}`);

    let logs = "";

    try {
      // ─── Step 1: Pull Image & Start Container ────────────────
      logs += `[${new Date().toISOString()}] Starting deployment for ${clientName}\n`;
      logs += `[${new Date().toISOString()}] Domain: ${domain}\n`;
      logs += `[${new Date().toISOString()}] Image: ${image}\n\n`;

      await updateDeployment(deploymentId, {
        status: "Pulling Image",
        logs,
      });

      logger.info(`[Worker] Deploying Docker container: ${image}`);

      const dockerResult = await dockerService.deploy({
        image,
        domain,
        clientName,
      });

      logs += `\n[${new Date().toISOString()}] Docker deployment successful\n`;
      logs += dockerResult.logs;

      await updateDeployment(deploymentId, {
        status: "Starting Container",
        containerId: dockerResult.containerId,
        port: dockerResult.port,
        logs,
      });

      // ─── Step 2: Trigger AWS Lambda ──────────────────────────
      logs += `\n[${new Date().toISOString()}] Triggering Lambda function...\n`;

      await updateDeployment(deploymentId, {
        status: "Invoking Lambda",
        logs,
      });

      logger.info(`[Worker] Triggering Lambda function`);

      const lambdaResult = await lambdaService.invoke({
        clientName,
        domain,
        containerId: dockerResult.containerId,
        port: dockerResult.port,
        image,
      });

      logs += `[${new Date().toISOString()}] Lambda invoked successfully\n`;
      logs += `[${new Date().toISOString()}] Lambda status: ${lambdaResult.statusCode}\n`;

      // ─── Step 3: Mark as Completed ───────────────────────────
      logs += `\n[${new Date().toISOString()}] ✅ Deployment completed successfully!\n`;
      logs += `[${new Date().toISOString()}] Container: ${dockerResult.containerId}\n`;
      logs += `[${new Date().toISOString()}] Port: ${dockerResult.port}\n`;
      logs += `[${new Date().toISOString()}] Domain: ${domain}\n`;

      await updateDeployment(deploymentId, {
        status: "Completed",
        lambdaResponse: lambdaResult,
        logs,
      });

      logger.info(`[Worker] ✅ Deployment ${deploymentId} completed successfully`);

      return { success: true, containerId: dockerResult.containerId };
    } catch (error) {
      // ─── Handle Failure ──────────────────────────────────────
      logs += `\n[${new Date().toISOString()}] ❌ Deployment FAILED\n`;
      logs += `[${new Date().toISOString()}] Error: ${error.message}\n`;

      await updateDeployment(deploymentId, {
        status: "Failed",
        errorMessage: error.message,
        logs,
      });

      logger.error(`[Worker] ❌ Deployment ${deploymentId} failed:`, error);
      throw error; // Re-throw so BullMQ can retry
    }
  },
  {
    connection: config.redis,
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 5,
      duration: 60000, // Max 5 jobs per minute
    },
  }
);

// ─── Worker Events ────────────────────────────────────────────────
worker.on("completed", (job) => {
  logger.info(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  logger.error("[Worker] Worker error:", err);
});

// ─── Connect MongoDB & Start Worker ───────────────────────────────
async function start() {
  try {
    logger.info(`Worker connecting to primary MongoDB...`);
    await mongoose.connect(config.mongodbUri);
    logger.info("✅ Worker connected to MongoDB");
    logger.info("✅ Worker listening for deployment jobs...");
  } catch (error) {
    logger.error(`Worker failed to connect to primary MongoDB: ${error.stack || error}`);
    const localUri = "mongodb://127.0.0.1:27017/deployment-platform";
    logger.info(`⚠️ Attempting fallback connection to local MongoDB: ${localUri}`);
    try {
      await mongoose.connect(localUri);
      logger.info("✅ Worker connected to fallback local MongoDB successfully!");
      logger.info("✅ Worker listening for deployment jobs...");
    } catch (localError) {
      logger.error(`❌ Failed to start worker with local MongoDB fallback: ${localError.stack || localError}`);
      process.exit(1);
    }
  }
}

start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  await mongoose.disconnect();
  process.exit(0);
});
