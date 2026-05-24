const express = require("express");
const Deployment = require("../models/Deployment");
const deployQueue = require("../queue/deployQueue");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/deploy
 * Creates a new deployment, saves to MongoDB, pushes job to BullMQ queue,
 * and returns immediately with a 200 OK.
 */
router.post("/deploy", async (req, res) => {
  try {
    const { clientName, domain, image } = req.body;

    // Validation
    if (!clientName || !domain || !image) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: clientName, domain, image",
      });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        success: false,
        error: "Invalid domain format",
      });
    }

    // Check for duplicate domain
    const existing = await Deployment.findOne({
      domain,
      status: { $in: ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda", "Completed"] },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Domain "${domain}" is already deployed or in progress`,
      });
    }

    // Save deployment record to MongoDB with "Pending" status
    const deployment = new Deployment({
      clientName,
      domain,
      image,
      status: "Pending",
    });
    await deployment.save();

    logger.info(
      `[API] Deployment created: ${deployment._id} for ${clientName} (${domain})`
    );

    // Push the job to BullMQ queue
    await deployQueue.add(
      "deploy-job",
      {
        deploymentId: deployment._id.toString(),
        clientName,
        domain,
        image,
      },
      {
        jobId: deployment._id.toString(),
      }
    );

    logger.info(`[API] Job queued: ${deployment._id}`);

    // Return immediately (don't wait for deployment)
    res.status(200).json({
      success: true,
      message: "Deployment queued successfully",
      deploymentId: deployment._id,
    });
  } catch (error) {
    logger.error("[API] Deploy error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/status/:id
 * Returns the current deployment status.
 */
router.get("/status/:id", async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: "Deployment not found",
      });
    }

    res.json({
      success: true,
      deployment: {
        id: deployment._id,
        clientName: deployment.clientName,
        domain: deployment.domain,
        image: deployment.image,
        status: deployment.status,
        containerId: deployment.containerId,
        port: deployment.port,
        logs: deployment.logs,
        errorMessage: deployment.errorMessage,
        lambdaResponse: deployment.lambdaResponse,
        createdAt: deployment.createdAt,
        updatedAt: deployment.updatedAt,
      },
    });
  } catch (error) {
    logger.error("[API] Status error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/deployments
 * Returns all deployments, most recent first.
 */
router.get("/deployments", async (req, res) => {
  try {
    const deployments = await Deployment.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      deployments,
    });
  } catch (error) {
    logger.error("[API] Deployments list error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * DELETE /api/deployments/:id
 * Delete a deployment record.
 */
router.delete("/deployments/:id", async (req, res) => {
  try {
    const deployment = await Deployment.findByIdAndDelete(req.params.id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: "Deployment not found",
      });
    }

    logger.info(`[API] Deployment deleted: ${req.params.id}`);
    res.json({
      success: true,
      message: "Deployment deleted",
    });
  } catch (error) {
    logger.error("[API] Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
