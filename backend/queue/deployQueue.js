const { Queue } = require("bullmq");
const config = require("../config");
const logger = require("../utils/logger");

const deployQueue = new Queue("deployments", {
  connection: config.redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800, // keep failed jobs for 7 days
    },
  },
});

deployQueue.on("error", (err) => {
  logger.error("Queue error:", err);
});

logger.info("Deploy queue initialized");

module.exports = deployQueue;
