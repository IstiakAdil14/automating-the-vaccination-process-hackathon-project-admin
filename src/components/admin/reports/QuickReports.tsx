"use client";

import type { ElementType } from "react";
import { useState, useTransition } from "react";
import {
  TrendingUp, Map, Package, Users, ShieldAlert, Trash2,
  Download, Clock, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateReport } from "@/app/actions/reports";

/* --- Templates ---------------------------------------------------------------- */
const TEMPLATES = [
  {
    key:         "WEEKLY_PROGRESS",
    title:       "Weekly National Progress Report",
    description: "Vaccination counts, coverage %, center performance, and trend charts for the past 7 days.",
    icon:        TrendingUp,
    color:       "var(--accent)",
    metrics:     ["vaccinations", "coverage"],
    format:      "PDF" as const,
    estTime:     "~15 seconds",
  },
  {
    key:         "COVERAGE_SUMMARY",
    title:       "Monthly Coverage Summary by Division",
    description: "Division-level breakdown of vaccination coverage, demographics, and center activity.",
    icon:        Map,
    color:       "var(--info)",
    metrics:     ["coverage"],
    format:      "XLSX" as const,
    estTime:     "~20 seconds",
  },
  {
    key:         "SUPPLY_STATUS",
    title:       "Supply Chain Status Report",
    description: "Current stock levels, low-stock alerts, expiring vaccines, and dispatch history.",
    icon:        Package,
    color:       "var(--warning)",
    metrics:     ["supply", "wastage"],
    format:      "PDF" as const,
    estTime:     "~12 seconds",
  },
  {
    key:         "STAFF_PERFORMANCE",
    title:       "Staff Performance Digest",
    description: "Top performers, vaccinations per staff, shift attendance, and center-level rankings.",
    icon:        Users,
    color:       "#8B5CF6",
    metrics:     ["staff_performance"],
    format:      "XLSX" as const,
    estTime:     "~10 seconds",
  },
  {
    key:         "FRAUD_SUMMARY",
    title:       "Fraud Summary Report",
    description: "All fraud alerts, resolution rates, duplicate NID cases, and QR tamper incidents.",
    icon:        ShieldAlert,
    color:       "var(--danger)",
    metrics:     ["fraud"],
    format:      "PDF" as const,
    estTime:     "~8 seconds",
  },
  {
    key:         "WASTAGE_REPORT",
    title:       "Vaccine Wastage Report",
    description: "Expiring vaccines, wastage events, cold-chain failures, and center-level wastage rates.",
    icon:        Trash2,
    color:       "#F97316",
    metrics:     ["wastage", "supply"],
    format:      "CSV" as const,
    estTime:     "~6 seconds",
  },
] as const;

/* --- Progress simulation ------------------------------------------------------ */
function useProgress() {
  const [progress, setProgress] = useState(0);

  function start() {
    setProgress(0);
    const steps = [5, 15, 30, 50, 70, 85, 95];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setProgress(steps[i++]);
        setTimeout(tick, 600 + Math.random() * 400);
      }
    };
    tick();
  }

  function finish() { setProgress(100); }
  function reset()  { setProgress(0); }

  return { progress, start, finish, reset };
}

/* --- Download helper ---------------------------------------------------------- */
function downloadBase64(base64: string, mimeType: string, filename: string) {
  const bytes  = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob   = new Blob([bytes], { type: mimeType });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* --- ReportCard --------------------------------------------------------------- */
interface CardState { status: "idle" | "generating" | "done" | "error"; message?: string }

interface TplShape {
  key: string; title: string; description: string;
  icon: ElementType; color: string;
  metrics: readonly string[]; format: "PDF" | "CSV" | "XLSX" | "JSON";
  estTime: string;
}

function ReportCard({ tpl }: { tpl: TplShape }) {
  const [state,    setState]    = useState<CardState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const { progress, start, finish, reset } = useProgress();

  const Icon = tpl.icon;

  function generate() {
    setState({ status: "generating" });
    start();
    startTransition(async () => {
      const now  = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to   = now.toISOString().slice(0, 10);

      const res = await generateReport({
        type:     tpl.key,
        title:    tpl.title,
        format:   tpl.format,
        dateFrom: from,
        dateTo:   to,
        metrics:  [...tpl.metrics],
      });

      finish();

      if (res.ok) {
        setState({ status: "done" });
        downloadBase64(res.data.base64, res.data.mimeType, res.data.filename);
        setTimeout(() => { setState({ status: "idle" }); reset(); }, 3000);
      } else {
        setState({ status: "error", message: res.error });
        setTimeout(() => { setState({ status: "idle" }); reset(); }, 4000);
      }
    });
  }

  return (
    <div className={cn(
      "flex flex-col gap-4 rounded-xl border p-5 transition-colors",
      state.status === "done"  ? "border-[var(--accent)] bg-[var(--accent-subtle)]" :
      state.status === "error" ? "border-[var(--danger)] bg-[var(--danger-subtle)]" :
      "border-[var(--border)] bg-[var(--surface)]"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-subtle)]">
          <Icon className="h-5 w-5" style={{ color: tpl.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)]">{tpl.title}</p>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{tpl.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />{tpl.estTime}
        </span>
        <span className="rounded-full bg-[var(--background-subtle)] px-2 py-0.5 font-mono">{tpl.format}</span>
      </div>

      {/* Progress bar */}
      {state.status === "generating" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--foreground-muted)]">Generating report-</span>
            <span className="font-mono font-semibold text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {state.status === "done" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
          <CheckCircle2 className="h-4 w-4" /> Downloaded successfully
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-center gap-2 text-xs text-[var(--danger)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {state.message ?? "Generation failed"}
        </div>
      )}

      <Button
        size="sm"
        onClick={generate}
        disabled={isPending || state.status === "generating"}
        className={cn(
          "w-full text-white hover:opacity-90",
          state.status === "done" ? "bg-[var(--accent)]" : "bg-[var(--foreground)]"
        )}
        style={state.status !== "done" ? { backgroundColor: tpl.color } : undefined}
      >
        {state.status === "generating"
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating-</>
          : <><Download className="h-4 w-4" /> Generate {tpl.format}</>}
      </Button>
    </div>
  );
}

export function QuickReports() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {TEMPLATES.map((tpl) => <ReportCard key={tpl.key} tpl={tpl} />)}
    </div>
  );
}
