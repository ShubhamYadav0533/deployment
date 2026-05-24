import React from "react";
import { FiBox, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

function StatsBar({ deployments }) {
  const total = deployments.length;
  const completed = deployments.filter((d) => d.status === "Completed").length;
  const failed = deployments.filter((d) => d.status === "Failed").length;
  const active = deployments.filter((d) =>
    ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda"].includes(d.status)
  ).length;

  const stats = [
    {
      label: "Total",
      value: total,
      icon: FiBox,
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.1)",
    },
    {
      label: "Active",
      value: active,
      icon: FiClock,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "Completed",
      value: completed,
      icon: FiCheckCircle,
      color: "#22c55e",
      bg: "rgba(34, 197, 94, 0.1)",
    },
    {
      label: "Failed",
      value: failed,
      icon: FiXCircle,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
    },
  ];

  return (
    <div className="stats-bar">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color, background: stat.bg }}>
              <Icon size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsBar;
