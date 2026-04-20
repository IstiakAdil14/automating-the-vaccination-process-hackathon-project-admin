"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFraudStream, type LiveAlert } from "@/hooks/useFraudStream";

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-[var(--danger)] bg-[var(--danger-subtle)]",
  HIGH:     "border-orange-400 bg-orange-50 dark:bg-orange-950",
};

const TYPE_LABELS: Record<string, string> = {
  DUPLICATE_NID:  "Duplicate NID",
  TAMPERED_QR:    "Tampered QR",
  MULTI_LOCATION: "Multi-Location",
  INVALID_BATCH:  "Invalid Batch",
};

export function LiveAlertBanner() {
  const { liveAlerts, connected, dismiss, dismissAll } = useFraudStream();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" style={{ maxWidth: 380 }}>
      {/* Connection indicator */}
      <div className={cn(
        "flex items-center gap-1.5 self-end rounded-full px-2.5 py-1 text-[10px] font-semibold",
        connected
          ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
          : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
      )}>
        {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {connected ? "Live" : "Offline"}
      </div>

      {liveAlerts.length > 1 && (
        <button
          onClick={dismissAll}
          className="self-end text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline"
        >
          Dismiss all ({liveAlerts.length})
        </button>
      )}

      <AnimatePresence>
        {liveAlerts.map((alert) => (
          <motion.div
            key={alert.alertId}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 60,  scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 shadow-lg",
              SEVERITY_STYLES[alert.severity] ?? "border-[var(--border)] bg-[var(--surface)]"
            )}
          >
            <AlertTriangle className={cn(
              "mt-0.5 h-4 w-4 flex-shrink-0",
              alert.severity === "CRITICAL" ? "text-[var(--danger)]" : "text-orange-500"
            )} />
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-xs font-bold uppercase tracking-wider",
                alert.severity === "CRITICAL" ? "text-[var(--danger)]" : "text-orange-600 dark:text-orange-400"
              )}>
                {alert.severity} - {TYPE_LABELS[alert.alertType] ?? alert.alertType}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{alert.centerName}</p>
              <p className="text-xs text-[var(--foreground-muted)]">{alert.division}</p>
            </div>
            <button
              onClick={() => dismiss(alert.alertId)}
              className="flex-shrink-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
