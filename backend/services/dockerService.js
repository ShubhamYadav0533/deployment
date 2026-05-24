const { NodeSSH } = require("node-ssh");
const {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
} = require("@aws-sdk/client-ssm");
const fs = require("fs");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Docker Service
 * Handles Docker operations on the EC2 instance via SSH or AWS SSM.
 */
class DockerService {
  /**
   * Execute Docker commands on EC2 via SSH.
   * @param {Object} params
   * @param {string} params.image - Docker image to pull and run
   * @param {string} params.domain - Client domain for container naming
   * @param {string} params.clientName - Client name for container label
   * @returns {Object} { containerId, port, logs }
   */
  async deployViaSSH({ image, domain, clientName }) {
    const ssh = new NodeSSH();
    const containerName = this._sanitizeContainerName(clientName);
    let logs = "";

    try {
      logger.info(`[SSH] Connecting to EC2: ${config.ec2.host}`);

      // Read private key
      const privateKey = fs.readFileSync(config.ec2.privateKeyPath, "utf8");

      await ssh.connect({
        host: config.ec2.host,
        username: config.ec2.username,
        privateKey: privateKey,
      });

      logs += `Connected to EC2 server ${config.ec2.host}\n`;
      logger.info(`[SSH] Connected successfully`);

      // Step 1: Pull the Docker image
      logger.info(`[SSH] Pulling image: ${image}`);
      const pullResult = await ssh.execCommand(`docker pull ${image}`);
      logs += `Pulling image: ${image}\n`;
      logs += pullResult.stdout + "\n";

      if (pullResult.code !== 0) {
        throw new Error(`Docker pull failed: ${pullResult.stderr}`);
      }
      logs += `Image pulled successfully\n`;

      // Step 2: Stop and remove existing container if any
      await ssh.execCommand(`docker stop ${containerName} 2>/dev/null || true`);
      await ssh.execCommand(`docker rm ${containerName} 2>/dev/null || true`);

      // Step 3: Find available port (random port in range 3001-9000)
      const port = Math.floor(Math.random() * 5999) + 3001;

      // Step 4: Run the Docker container
      logger.info(`[SSH] Starting container: ${containerName} on port ${port}`);
      const runCommand = `docker run -d --name ${containerName} -p ${port}:80 --label "domain=${domain}" --restart unless-stopped ${image}`;

      const runResult = await ssh.execCommand(runCommand);
      logs += `Running: ${runCommand}\n`;

      if (runResult.code !== 0) {
        throw new Error(`Docker run failed: ${runResult.stderr}`);
      }

      const containerId = runResult.stdout.trim().substring(0, 12);
      logs += `Container started: ${containerId}\n`;
      logs += `Mapped to port: ${port}\n`;

      // Step 5: Verify container is running
      const verifyResult = await ssh.execCommand(
        `docker ps --filter "name=${containerName}" --format "{{.Status}}"`
      );
      logs += `Container status: ${verifyResult.stdout.trim()}\n`;

      logger.info(
        `[SSH] Container ${containerId} running on port ${port}`
      );

      ssh.dispose();
      return { containerId, port, logs };
    } catch (error) {
      ssh.dispose();
      logs += `ERROR: ${error.message}\n`;
      logger.error(`[SSH] Deployment failed:`, error);
      throw error;
    }
  }

  /**
   * Execute Docker commands on EC2 via AWS SSM SendCommand.
   * @param {Object} params
   * @param {string} params.image - Docker image to pull and run
   * @param {string} params.domain - Client domain for container naming
   * @param {string} params.clientName - Client name for container label
   * @returns {Object} { containerId, port, logs }
   */
  async deployViaSSM({ image, domain, clientName }) {
    const containerName = this._sanitizeContainerName(clientName);
    const port = Math.floor(Math.random() * 5999) + 3001;
    let logs = "";

    const ssmClient = new SSMClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });

    try {
      logger.info(
        `[SSM] Sending command to instance: ${config.ec2.instanceId}`
      );

      const commands = [
        `docker pull ${image}`,
        `docker stop ${containerName} 2>/dev/null || true`,
        `docker rm ${containerName} 2>/dev/null || true`,
        `docker run -d --name ${containerName} -p ${port}:80 --label "domain=${domain}" --restart unless-stopped ${image}`,
        `docker ps --filter "name=${containerName}" --format "{{.ID}} {{.Status}}"`,
      ];

      const sendCommand = new SendCommandCommand({
        InstanceIds: [config.ec2.instanceId],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: commands,
        },
        TimeoutSeconds: 300,
      });

      const sendResult = await ssmClient.send(sendCommand);
      const commandId = sendResult.Command.CommandId;

      logs += `SSM Command sent: ${commandId}\n`;
      logger.info(`[SSM] Command sent: ${commandId}`);

      // Poll for command completion
      let status = "InProgress";
      let attempts = 0;
      const maxAttempts = 30;

      while (status === "InProgress" && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const getInvocation = new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: config.ec2.instanceId,
        });

        try {
          const invocationResult = await ssmClient.send(getInvocation);
          status = invocationResult.Status;
          logs += invocationResult.StandardOutputContent || "";

          if (status === "Failed") {
            throw new Error(
              `SSM command failed: ${invocationResult.StandardErrorContent}`
            );
          }
        } catch (err) {
          if (err.name === "InvocationDoesNotExist") {
            continue; // Not ready yet
          }
          throw err;
        }
      }

      if (status === "InProgress") {
        throw new Error("SSM command timed out");
      }

      logs += `Container started on port: ${port}\n`;
      logger.info(`[SSM] Deployment completed successfully`);

      return { containerId: containerName, port, logs };
    } catch (error) {
      logs += `ERROR: ${error.message}\n`;
      logger.error(`[SSM] Deployment failed:`, error);
      throw error;
    }
  }

  /**
   * Simulate Docker deployment for demo/interview purposes.
   * Produces realistic logs and delays to demonstrate the full pipeline.
   */
  async deploySimulated({ image, domain, clientName }) {
    const containerName = this._sanitizeContainerName(clientName);
    const port = Math.floor(Math.random() * 5999) + 3001;
    const containerId = [...Array(12)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    let logs = "";

    logger.info(`[SIM] Simulating Docker deployment for ${clientName}`);

    // Simulate: docker pull
    logs += `$ docker pull ${image}\n`;
    await new Promise((r) => setTimeout(r, 1500));
    logs += `latest: Pulling from library/${image.split(":")[0]}\n`;
    logs += `a2abf6c4d29d: Pull complete\n`;
    logs += `a9edb18cadd6: Pull complete\n`;
    logs += `589b7251471a: Pull complete\n`;
    logs += `Digest: sha256:${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join("")}\n`;
    logs += `Status: Downloaded newer image for ${image}\n\n`;

    // Simulate: docker stop & rm old container
    logs += `$ docker stop ${containerName} 2>/dev/null || true\n`;
    logs += `$ docker rm ${containerName} 2>/dev/null || true\n\n`;
    await new Promise((r) => setTimeout(r, 800));

    // Simulate: docker run
    const runCmd = `docker run -d --name ${containerName} -p ${port}:80 --label "domain=${domain}" --restart unless-stopped ${image}`;
    logs += `$ ${runCmd}\n`;
    await new Promise((r) => setTimeout(r, 1200));
    logs += `${containerId}\n\n`;

    // Simulate: docker ps verify
    logs += `$ docker ps --filter "name=${containerName}" --format "{{.Status}}"\n`;
    logs += `Up 2 seconds\n\n`;

    logs += `Container ${containerId} running on port ${port}\n`;
    logs += `Domain ${domain} → localhost:${port}\n`;

    logger.info(`[SIM] Container ${containerId} simulated on port ${port}`);

    return { containerId, port, logs };
  }

  /**
   * Main deploy method - chooses between SSH, SSM, or simulation based on config.
   */
  async deploy(params) {
    // Use SSM if configured
    if (config.ec2.useSSM) {
      if (config.ec2.instanceId && config.aws.accessKeyId) {
        return this.deployViaSSM(params);
      }
      logger.warn("[Docker] SSM enabled but credentials missing — falling back to simulation");
    }

    // Use SSH if the key file exists
    if (!config.ec2.useSSM && config.ec2.privateKeyPath) {
      try {
        fs.accessSync(config.ec2.privateKeyPath, fs.constants.R_OK);
        return this.deployViaSSH(params);
      } catch {
        logger.warn(`[Docker] SSH key not found at ${config.ec2.privateKeyPath} — falling back to simulation`);
      }
    }

    // Fallback: simulation mode for demo/interview
    logger.info("[Docker] Running in SIMULATION mode (no real EC2 connection)");
    return this.deploySimulated(params);
  }

  /**
   * Sanitize container name from client name.
   */
  _sanitizeContainerName(clientName) {
    return clientName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .concat("-app");
  }
}

module.exports = new DockerService();
