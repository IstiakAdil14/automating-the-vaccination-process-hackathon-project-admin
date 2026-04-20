"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@/types";

const DEFAULT: DashboardStats = {
  totalCitizens: 0,
  totalVaccinated: 0,
  totalCenters: 0,
  totalStaff: 0,
  vaccinationsToday: 0,
  pendingAppointments: 0,
  lowStockAlerts: 0,
  fraudAlerts: 0,
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
