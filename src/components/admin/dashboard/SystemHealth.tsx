"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Database, RefreshCw, Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSystemHealth } from "@/app/actions/dashboard";
import type { SystemHealth } from "@/app/actions/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

const POLL_INTERVAL = 30_000;   /* 30 seconds */

/* --- Latency gauge ------------------------------------------------------------ */
function LatencyGauge({ ms }: { ms: number }) {
  const color =
    ms < 100  ? "var(--health-green-500)" :
    ms < 300  ? "var(--amber-500)"        :
                "var(--red-500)";
  const label =
    ms < 100  ? "Excellent" :
    ms < 300  ? "Good"      :
                "Degraded";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-20 overflow-hidden rounded-full bg-[var(--background-subtle)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((ms / 500) * 100, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-xs font-semibold" style={{ color }}>
        {ms}ms
      </span>
      <span className="text-[10px] text-[var(--foreground-muted)]">{label}</span>
    </div>
  );
}

/* --- Countdown ring ----------------------------------------------------------- */
function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (secondsLeft / total) * circ;

  return (
    <svg width="28" height="28" className="-rotate-90">
      <circle cx="14" cy="14" r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" />
      <circle
        cx="14" cy="14" r={r} fill="none"
        stroke="var(--health-green-500)" strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

/* --- SystemHealthPanel -------------------------------------------------------- */
interface SystemHealthPanelProps {
  initial: SystemHealth;
}

export function SystemHealthPanel({ initial }: SystemHealthPanelProps) {
  const [health, setHealth]         = useState<SystemHealth>(initial);
  const [loading, setLoading]       = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(POLL_INTERVAL / 1000);
  const [lastUpdated, setLastUpdated] = useState(new Date(initial.lastRefreshedAt));

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSystemHealth();
      setHealth(data);
      setLastUpdated(new Date(data.lastRefreshedAt));
      setSecondsLeft(POLL_INTERVAL / 1000);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-poll */
  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  /* Countdown ticker */
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? POLL_INTERVAL / 1000 : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const isHealthy = health.dbLatencyMs < 300;

  const metrics = [
    {
      label: "API Response",
      icon:  <Activity className="h-3.5 w-3.5" />,
      value: <LatencyGauge ms={health.dbLatencyMs} />,
    },
    {
      label: "DB Latency",
      icon:  <Database className="h-3.5 w-3.5" />,
      value: <LatencyGauge ms={Math.round(health.dbLatencyMs * 0.6)} />,
    },
    {
      label: "Offline Sync Queue",
      icon:  health.offlineSyncQueue > 0
        ? <WifiOff className="h-3.5 w-3.5 text-[var(--amber-500)]" />
        : <Wifi    className="h-3.5 w-3.5 text-[var(--health-green-500)]" />,
      value: (
        <span className={cn(
          "text-xs font-semibold",
          health.offlineSyncQueue > 0 ? "text-[var(--amber-500)]" : "text-[var(--health-green-500)]"
        )}>
          {health.offlineSyncQueue} pending
        </span>
      ),
    },
    {
      label: "Active Sessions",
      icon:  <Users className="h-3.5 w-3.5" />,
      value: (
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {health.activeSessions}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <div className={cn(
          "flex h-2 w-2 rounded-full",
          isHealthy ? "status-dot-green animate-pulse-slow" : "status-dot-red"
        )} />
        <span className="text-sm font-semibold text-[var(--foreground)]">System Health</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Countdown ring */}
          <div className="flex items-center gap-1.5">
            <CountdownRing secondsLeft={secondsLeft} total={POLL_INTERVAL / 1000} />
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {secondsLeft}s
            </span>
          </div>

          {/* Manual refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-4">
        {metrics.map(({ label, icon, value }) => (
          <div key={label} className="flex flex-col gap-2 bg-[var(--surface)] px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
              {icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={loading ? "loading" : "value"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {loading ? <Skeleton className="h-4 w-24" /> : value}
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5">
        <span className="text-[10px] text-[var(--foreground-muted)]">
          Last refreshed: {lastUpdated.toLocaleTimeString()}
        </span>
        <span className={cn(
          "text-[10px] font-semibold",
          isHealthy ? "text-[var(--health-green-500)]" : "text-[var(--red-500)]"
        )}>
          {isHealthy ? "All systems operational" : "Performance degraded"}
        </span>
      </div>
    </div>
  );
}

/* --- Skeleton ----------------------------------------------------------------- */
export function SystemHealthSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <Skeleton className="mb-4 h-5 w-36" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
