"use client";

import { useState, useTransition, useEffect } from "react";
import { QrCode, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { getFraudAlerts, type FraudAlertRow } from "@/app/actions/fraud";
import { CaseInvestigationDrawer } from "./CaseInvestigationDrawer";

const TAMPER_TYPE_LABELS: Record<string, string> = {
  TAMPERED_QR:    "Tampered QR Code",
  INVALID_BATCH:  "Invalid Batch QR",
  DUPLICATE_NID:  "Duplicate Identity QR",
  MULTI_LOCATION: "Multi-Location Scan",
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-[var(--danger-subtle)] text-[var(--danger)]",
  HIGH:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  MEDIUM:   "bg-[var(--info-subtle)] text-[var(--info)]",
  LOW:      "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

function hashFromDetails(details: Record<string, unknown>): string {
  const raw = details?.qrHash ?? details?.hash ?? details?.code ?? "-";
  const s   = String(raw);
  if (s.length <= 12) return s;
  return s.slice(0, 6) + "-" + s.slice(-6);
}

export function QRTamperReports() {
  const [data,       setData]       = useState<FraudAlertRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      // Fetch all QR-related fraud types
      const [qr, batch] = await Promise.all([
        getFraudAlerts({ type: "TAMPERED_QR",   limit: 100 }),
        getFraudAlerts({ type: "INVALID_BATCH",  limit: 100 }),
      ]);
      const combined: FraudAlertRow[] = [
        ...(qr.ok    ? qr.data.data    : []),
        ...(batch.ok ? batch.data.data : []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setData(combined);
    });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">QR Tamper & Invalid Scan Reports</p>
          </div>
          <span className="text-xs text-[var(--foreground-muted)]">
            {isPending ? "Loading-" : `${data.length} report${data.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {["Timestamp","Scanning Center","Division","Citizen","QR Hash","Tamper Type","Severity","Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isPending ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-[var(--foreground-muted)]" />
                      <p className="text-sm text-[var(--foreground-muted)]">No QR tamper reports found</p>
                    </div>
                  </td></tr>
                ) : data.map((row) => (
                  <tr
                    key={row._id}
                    className={cn(
                      "transition-colors hover:bg-[var(--background-subtle)]",
                      row.severity === "CRITICAL" && "bg-[var(--danger-subtle)]"
                    )}
                  >
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)] tabular-nums">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[var(--foreground)]">{row.centerName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{row.division}</td>
                    <td className="px-4 py-3.5">
                      {row.userName ? (
                        <div>
                          <p className="text-sm text-[var(--foreground)]">{row.userName}</p>
                          {row.userNid && (
                            <p className="font-mono text-xs text-[var(--foreground-muted)]">
                              XXXX-XXXX-{row.userNid.slice(-4)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--foreground-muted)]">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[var(--foreground-muted)]">
                      {hashFromDetails(row.details)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-[var(--background-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                        {TAMPER_TYPE_LABELS[row.type] ?? row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", SEVERITY_STYLES[row.severity])}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setSelectedId(row._id)}
                        className="h-7 gap-1 px-2 text-xs text-[var(--info)] hover:bg-[var(--info-subtle)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CaseInvestigationDrawer
        alertId={selectedId}
        onClose={() => setSelectedId(null)}
        onResolved={() => {
          setSelectedId(null);
          // Reload
          startTransition(async () => {
            const [qr, batch] = await Promise.all([
              getFraudAlerts({ type: "TAMPERED_QR",  limit: 100 }),
              getFraudAlerts({ type: "INVALID_BATCH", limit: 100 }),
            ]);
            const combined = [
              ...(qr.ok    ? qr.data.data    : []),
              ...(batch.ok ? batch.data.data : []),
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setData(combined);
          });
        }}
      />
    </>
  );
}
