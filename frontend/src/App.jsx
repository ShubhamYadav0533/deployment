import React, { useState, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import DeployForm from "./components/DeployForm";
import DeploymentList from "./components/DeploymentList";
import StatsBar from "./components/StatsBar";
import { getDeployments } from "./api";

function App() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDeployments = useCallback(async () => {
    try {
      const data = await getDeployments();
      setDeployments(data);
    } catch (err) {
      console.error("Failed to fetch deployments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Poll for updates every 3 seconds when there are active deployments
  useEffect(() => {
    const hasActive = deployments.some((d) =>
      ["Pending", "Pulling Image", "Starting Container", "Invoking Lambda"].includes(d.status)
    );

    if (hasActive) {
      const interval = setInterval(fetchDeployments, 3000);
      return () => clearInterval(interval);
    }
  }, [deployments, fetchDeployments]);

  const handleDeploySuccess = () => {
    fetchDeployments();
  };

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            color: "#e2e8f0",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            backdropFilter: "blur(12px)",
            fontFamily: "'Inter', sans-serif",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#0f172a" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#0f172a" },
          },
        }}
      />

      {/* Animated background elements */}
      <div className="bg-gradient"></div>
      <div className="bg-grid"></div>
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      <div className="bg-orb bg-orb-3"></div>

      <div className="app-content">
        <Header />
        <StatsBar deployments={deployments} />

        <main className="main-grid">
          <section className="deploy-section">
            <DeployForm onSuccess={handleDeploySuccess} />
          </section>

          <section className="dashboard-section">
            <DeploymentList deployments={deployments} loading={loading} onRefresh={fetchDeployments} />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
