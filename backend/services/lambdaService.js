const {
  LambdaClient,
  InvokeCommand,
} = require("@aws-sdk/client-lambda");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Lambda Service
 * Triggers AWS Lambda functions for post-deployment setup using AWS SDK v3.
 */
class LambdaService {
  constructor() {
    this.client = new LambdaClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }

  /**
   * Invoke a Lambda function for post-deployment tasks.
   * @param {Object} payload - Data to send to Lambda
   * @param {string} payload.clientName - Client name
   * @param {string} payload.domain - Domain configured
   * @param {string} payload.containerId - Docker container ID
   * @param {number} payload.port - Port the container is running on
   * @param {string} payload.image - Docker image used
   * @returns {Object} Lambda response
   */
  async invoke(payload) {
    try {
      logger.info(
        `[Lambda] Invoking function: ${config.aws.lambdaFunctionName}`
      );

      const command = new InvokeCommand({
        FunctionName: config.aws.lambdaFunctionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify({
          action: "post-deployment-setup",
          timestamp: new Date().toISOString(),
          deployment: {
            clientName: payload.clientName,
            domain: payload.domain,
            containerId: payload.containerId,
            port: payload.port,
            image: payload.image,
          },
        })),
      });

      const response = await this.client.send(command);

      // Decode the response payload
      const responsePayload = response.Payload
        ? JSON.parse(Buffer.from(response.Payload).toString())
        : null;

      logger.info(
        `[Lambda] Function executed. Status: ${response.StatusCode}`
      );

      if (response.FunctionError) {
        throw new Error(
          `Lambda function error: ${response.FunctionError} - ${JSON.stringify(responsePayload)}`
        );
      }

      return {
        statusCode: response.StatusCode,
        payload: responsePayload,
        executedVersion: response.ExecutedVersion,
      };
    } catch (error) {
      logger.error(`[Lambda] Invocation failed:`, error);
      throw error;
    }
  }
}

module.exports = new LambdaService();
