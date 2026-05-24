import React, { useState } from "react";
import { FiSend, FiUser, FiGlobe, FiBox, FiLoader } from "react-icons/fi";
import toast from "react-hot-toast";
import { createDeployment } from "../api";

function DeployForm({ onSuccess }) {
  const [form, setForm] = useState({
    clientName: "",
    domain: "",
    image: "nginx:latest",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!form.domain.trim()) {
      toast.error("Domain is required");
      return;
    }
    if (!form.image.trim()) {
      toast.error("Docker image is required");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createDeployment(form);
      toast.success(`Deployment queued for ${form.clientName}`);
      setForm({ clientName: "", domain: "", image: "nginx:latest" });
      onSuccess?.(result);
    } catch (err) {
      const message =
        err.response?.data?.error || "Failed to create deployment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const presetImages = [
    { label: "Nginx", value: "nginx:latest" },
    { label: "Node.js", value: "node:20-alpine" },
    { label: "Python", value: "python:3.12-slim" },
    { label: "Redis", value: "redis:alpine" },
    { label: "PostgreSQL", value: "postgres:16-alpine" },
    { label: "WordPress", value: "wordpress:latest" },
  ];

  return (
    <div className="card deploy-card">
      <div className="card-header">
        <div className="card-icon deploy-icon">
          <FiSend size={20} />
        </div>
        <div>
          <h2 className="card-title">New Deployment</h2>
          <p className="card-subtitle">Onboard a new client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="deploy-form">
        {/* Client Name */}
        <div className="form-group">
          <label htmlFor="clientName" className="form-label">
            <FiUser size={14} />
            Client Name
          </label>
          <input
            id="clientName"
            name="clientName"
            type="text"
            className="form-input"
            placeholder="e.g. Acme Corp"
            value={form.clientName}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
        </div>

        {/* Domain */}
        <div className="form-group">
          <label htmlFor="domain" className="form-label">
            <FiGlobe size={14} />
            Domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            className="form-input"
            placeholder="e.g. acme.ourplatform.com"
            value={form.domain}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
        </div>

        {/* Docker Image */}
        <div className="form-group">
          <label htmlFor="image" className="form-label">
            <FiBox size={14} />
            Docker Image
          </label>
          <input
            id="image"
            name="image"
            type="text"
            className="form-input"
            placeholder="e.g. nginx:latest"
            value={form.image}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
          <div className="image-presets">
            {presetImages.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`preset-chip ${form.image === preset.value ? "active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, image: preset.value }))}
                disabled={submitting}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-deploy"
          disabled={submitting}
          id="deploy-button"
        >
          {submitting ? (
            <>
              <FiLoader className="spin" size={18} />
              Queuing Deployment...
            </>
          ) : (
            <>
              <FiSend size={18} />
              Deploy
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default DeployForm;
