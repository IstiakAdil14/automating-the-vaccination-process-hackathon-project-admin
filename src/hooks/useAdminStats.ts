"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardStats } from "@/types";

const DEFAULT_STATS: DashboardStats = {
  totalCitizens:         0,
  totalVaccinated:       0,
  totalPartial:          0,
  coveragePercent:       0,
  totalCenters:          0,
  activeCenters:         0,
  totalStaff:            0,
  activeStaff:           0,
  vaccinationsToday:     0,
  vaccinationsThisWeek:  0,
  vaccinationsThisMonth: 0,
  lowStockAlerts:        0,
  openFraudAlerts:       0,
  criticalFraudAlerts:   0,
};

interface UseAdminStatsOptions {
  /** Polling interval in ms. Set to 0 to disable. Default: 30_000 */
  pollInterval?: number;
}

export function useAdminStats({ pollInterval = 30_000 }: UseAdminStatsOptions = {}) {
  const [stats,     setStats]     = useState<DashboardStats>(DEFAULT_STATS);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stats", { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardStats = await res.json();
      setStats(data);
      setUpdatedAt(new Date());
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* Initial fetch */
  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  /* Polling */
  useEffect(() => {
    if (!pollInterval) return;
    const id = setInterval(() => fetch_(true), pollInterval);
    return () => clearInterval(id);
  }, [fetch_, pollInterval]);

  return { stats, loading, error, updatedAt, refetch: () => fetch_() };
}
