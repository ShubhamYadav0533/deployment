const mongoose = require("mongoose");

const deploymentSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    domain: {
      type: String,
      required: [true, "Domain is required"],
      trim: true,
      lowercase: true,
    },
    image: {
      type: String,
      required: [true, "Docker image is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda", "Completed", "Failed"],
      default: "Pending",
    },
    containerId: {
      type: String,
      default: null,
    },
    port: {
      type: Number,
      default: null,
    },
    logs: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    lambdaResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient status queries
deploymentSchema.index({ status: 1 });
deploymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Deployment", deploymentSchema);
