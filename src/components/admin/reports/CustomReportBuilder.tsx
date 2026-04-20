"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Calendar, Map, FileText, Eye, ChevronRight, ChevronLeft, Download, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateReport } from "@/app/actions/reports";

/* --- Config types ------------------------------------------------------------- */
interface BuilderConfig {
  metrics:   string[];
  datePreset: string;
  dateFrom:  string;
  dateTo:    string;
  scope:     "national" | "division" | "district";
  divisions: string[];
  format:    "PDF" | "CSV" | "XLSX" | "JSON";
}

const METRIC_GROUPS = [
  {
    group: "Vaccinations",
    items: [
      { key: "doses_count",    label: "Doses Count" },
      { key: "by_vaccine",     label: "By Vaccine Type" },
      { key: "by_center",      label: "By Center" },
    ],
  },
  {
    group: "Coverage",
    items: [
      { key: "coverage",       label: "% by Region" },
      { key: "coverage_age",   label: "By Age Group" },
      { key: "coverage_gender",label: "By Gender" },
    ],
  },
  {
    group: "Centers",
    items: [
      { key: "center_perf",    label: "Performance" },
      { key: "capacity",       label: "Capacity Utilization" },
    ],
  },
  {
    group: "Staff",
    items: [
      { key: "staff_performance", label: "Performance" },
      { key: "attendance",        label: "Attendance" },
    ],
  },
  {
    group: "Supply",
    items: [
      { key: "supply",         label: "Stock Levels" },
      { key: "wastage",        label: "Wastage" },
      { key: "expiry",         label: "Expiry Tracking" },
    ],
  },
  {
    group: "Fraud",
    items: [
      { key: "fraud",          label: "Flags & Alerts" },
      { key: "fraud_resolutions", label: "Resolutions" },
    ],
  },
];

const DATE_PRESETS = [
  { key: "this_week",    label: "This Week" },
  { key: "this_month",   label: "This Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "custom",       label: "Custom Range" },
];

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

const FORMATS: { key: "PDF" | "CSV" | "XLSX" | "JSON"; label: string; desc: string }[] = [
  { key: "PDF",  label: "PDF",  desc: "Formatted report with GoB header" },
  { key: "CSV",  label: "CSV",  desc: "Raw data, all rows" },
  { key: "XLSX", label: "Excel XLSX", desc: "Spreadsheet with multiple sheets" },
  { key: "JSON", label: "JSON", desc: "Machine-readable structured data" },
];

const STEPS = [
  { label: "Metrics",   icon: CheckSquare },
  { label: "Date Range",icon: Calendar },
  { label: "Geography", icon: Map },
  { label: "Format",    icon: FileText },
  { label: "Generate",  icon: Eye },
];

function presetDates(preset: string): { from: string; to: string } {
  const now  = new Date();
  const to   = now.toISOString().slice(0, 10);
  if (preset === "this_week") {
    const from = new Date(now); from.setDate(from.getDate() - 7);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (preset === "this_month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to };
  }
  if (preset === "this_quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to };
  }
  return { from: "", to: "" };
}

function downloadBase64(base64: string, mimeType: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob  = new Blob([bytes], { type: mimeType });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function CustomReportBuilder() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<BuilderConfig>({
    metrics: [], datePreset: "this_month",
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    dateTo:   new Date().toISOString().slice(0, 10),
    scope: "national", divisions: [], format: "PDF",
  });
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending,  startTransition] = useTransition();

  function toggleMetric(key: string) {
    setConfig((c) => ({
      ...c,
      metrics: c.metrics.includes(key) ? c.metrics.filter((m) => m !== key) : [...c.metrics, key],
    }));
  }

  function toggleDivision(div: string) {
    setConfig((c) => ({
      ...c,
      divisions: c.divisions.includes(div) ? c.divisions.filter((d) => d !== div) : [...c.divisions, div],
    }));
  }

  function applyPreset(preset: string) {
    const dates = presetDates(preset);
    setConfig((c) => ({ ...c, datePreset: preset, ...dates }));
  }

  function generate() {
    setResult(null);
    setProgress(0);

    // Simulate progress
    const steps = [10, 25, 45, 65, 80, 92, 98];
    let i = 0;
    const tick = () => { if (i < steps.length) { setProgress(steps[i++]); setTimeout(tick, 500 + Math.random() * 300); } };
    tick();

    startTransition(async () => {
      const res = await generateReport({
        type:     "CUSTOM",
        title:    `Custom Report - ${config.metrics.join(", ")}`,
        format:   config.format,
        dateFrom: config.dateFrom,
        dateTo:   config.dateTo,
        divisions: config.scope === "national" ? [] : config.divisions,
        metrics:  config.metrics,
      });

      setProgress(100);

      if (res.ok) {
        setResult({ ok: true, message: "Report generated successfully!" });
        downloadBase64(res.data.base64, res.data.mimeType, res.data.filename);
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  const canNext = [
    config.metrics.length > 0,
    config.dateFrom && config.dateTo,
    true,
    true,
    true,
  ][step];

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <div key={label} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                i === step
                  ? "bg-[var(--accent)] text-white"
                  : i < step
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)] hover:text-white"
                    : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)] mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">

        {/* Step 1 - Metrics */}
        {step === 0 && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">Select Metrics</p>
            {METRIC_GROUPS.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleMetric(key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        config.metrics.includes(key)
                          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                      )}
                    >
                      {config.metrics.includes(key) && <CheckCircle2 className="h-3 w-3" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {config.metrics.length === 0 && (
              <p className="text-xs text-[var(--danger)]">Select at least one metric to continue</p>
            )}
          </div>
        )}

        {/* Step 2 - Date Range */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Date Range</p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    config.datePreset === key
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {config.datePreset === "custom" && (
              <div className="flex items-center gap-3">
                <input type="date" value={config.dateFrom}
                  onChange={(e) => setConfig((c) => ({ ...c, dateFrom: e.target.value }))}
                  className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
                <span className="text-sm text-[var(--foreground-muted)]">to</span>
                <input type="date" value={config.dateTo} min={config.dateFrom}
                  onChange={(e) => setConfig((c) => ({ ...c, dateTo: e.target.value }))}
                  className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
              </div>
            )}
            {config.dateFrom && config.dateTo && (
              <p className="text-xs text-[var(--foreground-muted)]">
                Period: <strong>{config.dateFrom}</strong> - <strong>{config.dateTo}</strong>
              </p>
            )}
          </div>
        )}

        {/* Step 3 - Geography */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Geographic Scope</p>
            <div className="flex flex-wrap gap-2">
              {(["national","division"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, scope: s, divisions: [] }))}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all",
                    config.scope === s
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                  )}
                >
                  {s === "national" ? "National (All Divisions)" : "Select Divisions"}
                </button>
              ))}
            </div>
            {config.scope === "division" && (
              <div className="flex flex-wrap gap-2">
                {DIVISIONS.map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => toggleDivision(div)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      config.divisions.includes(div)
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                    )}
                  >
                    {div}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4 - Format */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Output Format</p>
            <div className="grid grid-cols-2 gap-3">
              {FORMATS.map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, format: key }))}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    config.format === key
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]"
                  )}
                >
                  <p className={cn("font-bold", config.format === key ? "text-[var(--accent)]" : "text-[var(--foreground)]")}>{label}</p>
                  <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 - Preview & Generate */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">Preview & Generate</p>

            {/* Summary */}
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] p-4">
              {[
                { label: "Metrics",    value: config.metrics.join(", ") || "None selected" },
                { label: "Period",     value: `${config.dateFrom} - ${config.dateTo}` },
                { label: "Geography",  value: config.scope === "national" ? "National" : config.divisions.join(", ") || "All divisions" },
                { label: "Format",     value: config.format },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <p className="w-24 flex-shrink-0 text-xs font-semibold text-[var(--foreground-muted)]">{label}</p>
                  <p className="text-sm text-[var(--foreground)]">{value}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            {isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground-muted)]">Generating report-</span>
                  <span className="font-mono font-semibold text-[var(--accent)]">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                result.ok
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
              )}>
                {result.ok ? <CheckCircle2 className="h-4 w-4" /> : null}
                {result.message}
              </div>
            )}

            <Button
              onClick={generate}
              disabled={isPending || config.metrics.length === 0}
              className="w-full bg-[var(--accent)] text-white hover:opacity-90"
              size="lg"
            >
              {isPending
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating ({progress}%)-</>
                : <><Download className="h-5 w-5" /> Generate {config.format} Report</>}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="bg-[var(--accent)] text-white hover:opacity-90"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
