require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/deployment-platform",

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  },

  // AWS
  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    lambdaFunctionName:
      process.env.LAMBDA_FUNCTION_NAME || "post-deployment-setup",
  },

  // EC2
  ec2: {
    host: process.env.EC2_HOST,
    username: process.env.EC2_USERNAME || "ubuntu",
    privateKeyPath: process.env.EC2_PRIVATE_KEY_PATH,
    instanceId: process.env.EC2_INSTANCE_ID,
    useSSM: process.env.USE_SSM === "true",
  },
};
