import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

/**
 * POST /api/deploy
 * Submit a new deployment request.
 */
export async function createDeployment({ clientName, domain, image }) {
  const { data } = await api.post("/deploy", { clientName, domain, image });
  return data;
}

/**
 * GET /api/status/:id
 * Fetch the status of a single deployment.
 */
export async function getDeploymentStatus(id) {
  const { data } = await api.get(`/status/${id}`);
  return data.deployment;
}

/**
 * GET /api/deployments
 * Fetch all deployments (most recent first).
 */
export async function getDeployments() {
  const { data } = await api.get("/deployments");
  return data.deployments;
}

/**
 * DELETE /api/deployments/:id
 * Delete a deployment record.
 */
export async function deleteDeployment(id) {
  const { data } = await api.delete(`/deployments/${id}`);
  return data;
}
