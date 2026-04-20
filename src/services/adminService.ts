const BASE = "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const adminService = {
  getStats: () => apiFetch("/admin/stats"),
  getCenters: () => apiFetch("/admin/centers"),
  getStaff: () => apiFetch("/admin/staff"),
  getInventory: () => apiFetch("/admin/inventory"),
  getFraudAlerts: () => apiFetch("/admin/fraud"),
  resolveFraud: (id: string) => apiFetch(`/admin/fraud/${id}/resolve`, { method: "PATCH" }),
  sendBroadcast: (data: { title: string; message: string; channel: string; targetRole: string }) =>
    apiFetch("/admin/broadcast", { method: "POST", body: JSON.stringify(data) }),
};
