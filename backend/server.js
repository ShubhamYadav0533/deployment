const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const config = require("./config");
const logger = require("./utils/logger");
const deployRoutes = require("./routes/deploy");

const app = express();

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// ─── Routes ─────────────────────────────────────────────────────
app.use("/api", deployRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Error Handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Database Connection & Server Start ─────────────────────────
async function start() {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info("✅ Connected to MongoDB");

    app.listen(config.port, () => {
      logger.info(`✅ API Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

module.exports = app;
