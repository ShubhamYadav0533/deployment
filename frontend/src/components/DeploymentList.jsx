import React, { useState } from "react";
import {
  FiActivity,
  FiRefreshCw,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiBox,
  FiGlobe,
  FiUser,
  FiTerminal,
} from "react-icons/fi";
import { deleteDeployment } from "../api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  Pending: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
    icon: FiClock,
    label: "Pending",
  },
  "Pulling Image": {
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    icon: FiLoader,
    label: "Pulling Image",
    animate: true,
  },
  "Starting Container": {
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.3)",
    icon: FiBox,
    label: "Starting Container",
    animate: true,
  },
  "Invoking Lambda": {
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.1)",
    border: "rgba(6, 182, 212, 0.3)",
    icon: FiActivity,
    label: "Invoking Lambda",
    animate: true,
  },
  Completed: {
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
    icon: FiCheckCircle,
    label: "Completed",
  },
  Failed: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
    icon: FiXCircle,
    label: "Failed",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const Icon = cfg.icon;

  return (
    <span
      className={`status-badge ${cfg.animate ? "animating" : ""}`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      <Icon size={14} className={cfg.animate ? "spin" : ""} />
      {cfg.label}
    </span>
  );
}

function DeploymentCard({ deployment, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this deployment record?")) return;
    setDeleting(true);
    try {
      await deleteDeployment(deployment._id);
      toast.success("Deployment deleted");
      onDelete?.();
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const isActive = ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda"].includes(
    deployment.status
  );

  const createdAt = new Date(deployment.createdAt).toLocaleString();

  // Progress steps
  const steps = ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda", "Completed"];
  const currentStep = steps.indexOf(deployment.status);
  const isFailed = deployment.status === "Failed";

  return (
    <div className={`deployment-card ${isActive ? "active-deployment" : ""} ${isFailed ? "failed-deployment" : ""}`}>
      <div className="deployment-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="deployment-info">
          <div className="deployment-name">
            <FiUser size={14} className="info-icon" />
            <strong>{deployment.clientName}</strong>
          </div>
          <div className="deployment-domain">
            <FiGlobe size={14} className="info-icon" />
            {deployment.domain}
          </div>
        </div>

        <div className="deployment-meta">
          <StatusBadge status={deployment.status} />
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              background: deployment.status === "Completed"
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)",
            }}
          />
          {isActive && <div className="progress-glow" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />}
        </div>
      )}

      {expanded && (
        <div className="deployment-details">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Image</span>
              <span className="detail-value">
                <FiBox size={12} /> {deployment.image}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                <FiClock size={12} /> {createdAt}
              </span>
            </div>
            {deployment.containerId && (
              <div className="detail-item">
                <span className="detail-label">Container</span>
                <span className="detail-value mono">{deployment.containerId}</span>
              </div>
            )}
            {deployment.port && (
              <div className="detail-item">
                <span className="detail-label">Port</span>
                <span className="detail-value mono">:{deployment.port}</span>
              </div>
            )}
            {deployment.errorMessage && (
              <div className="detail-item full-width error-detail">
                <span className="detail-label">Error</span>
                <span className="detail-value error-text">
                  {typeof deployment.errorMessage === "object"
                    ? (deployment.errorMessage.message || JSON.stringify(deployment.errorMessage))
                    : String(deployment.errorMessage)}
                </span>
              </div>
            )}
          </div>

          {/* Logs */}
          {deployment.logs && (
            <div className="logs-section">
              <div className="logs-header">
                <FiTerminal size={14} />
                <span>Deployment Logs</span>
              </div>
              <pre className="logs-content">{deployment.logs}</pre>
            </div>
          )}

          {/* Pipeline visualization */}
          <div className="pipeline">
            {steps.map((step, i) => {
              let state = "upcoming";
              if (isFailed && i <= currentStep) state = i === currentStep ? "failed" : "done";
              else if (i < currentStep) state = "done";
              else if (i === currentStep) state = isActive ? "active" : "done";

              return (
                <React.Fragment key={step}>
                  <div className={`pipeline-step ${state}`}>
                    <div className="pipeline-dot"></div>
                    <span className="pipeline-label">{step}</span>
                  </div>
                  {i < steps.length - 1 && <div className={`pipeline-connector ${state === "done" ? "done" : ""}`}></div>}
                </React.Fragment>
              );
            })}
          </div>

          <div className="deployment-actions">
            <button
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              <FiTrash2 size={14} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeploymentList({ deployments, loading, onRefresh }) {
  return (
    <div className="card dashboard-card">
      <div className="card-header">
        <div className="card-icon dashboard-icon">
          <FiActivity size={20} />
        </div>
        <div>
          <h2 className="card-title">Live Status Dashboard</h2>
          <p className="card-subtitle">
            {deployments.length} deployment{deployments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-refresh" onClick={onRefresh} title="Refresh">
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div className="deployment-list">
        {loading ? (
          <div className="empty-state">
            <FiLoader className="spin" size={32} />
            <p>Loading deployments...</p>
          </div>
        ) : deployments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FiBox size={48} />
            </div>
            <h3>No deployments yet</h3>
            <p>Deploy your first container to get started</p>
          </div>
        ) : (
          deployments.map((d) => (
            <DeploymentCard key={d._id} deployment={d} onDelete={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}

export default DeploymentList;
