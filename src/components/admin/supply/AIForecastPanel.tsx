"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { getForecast } from "@/app/actions/supply";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

interface Projection {
  vaccineName:  string;
  currentStock: number;
  days30:       number;
  days60:       number;
  days90:       number;
}

export function AIForecastPanel() {
  const [summary,     setSummary]     = useState<string | null>(null);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [error,       setError]       = useState("");
  const [isPending,   startTransition] = useTransition();

  function runForecast() {
    setError(""); setSummary(null); setProjections([]);
    startTransition(async () => {
      const res = await getForecast();
      if (!res.ok) { setError(res.error); return; }
      setSummary(res.data.summary);
      setProjections(res.data.projections);
    });
  }

  // Build chart data: 4 points per vaccine (now, 30d, 60d, 90d)
  const chartData = [
    { label: "Now",   ...Object.fromEntries(projections.map((p) => [p.vaccineName, p.currentStock])) },
    { label: "30d",   ...Object.fromEntries(projections.map((p) => [p.vaccineName, p.days30])) },
    { label: "60d",   ...Object.fromEntries(projections.map((p) => [p.vaccineName, p.days60])) },
    { label: "90d",   ...Object.fromEntries(projections.map((p) => [p.vaccineName, p.days90])) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">AI Supply Forecast</p>
            <p className="text-xs text-[var(--foreground-muted)]">Powered by GPT-4o - 30/60/90 day projections</p>
          </div>
        </div>
        <Button size="sm" onClick={runForecast} disabled={isPending} className="bg-[var(--accent)] text-white hover:opacity-90">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isPending ? "Analyzing-" : summary ? "Refresh" : "Run Forecast"}
        </Button>
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-16">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-[var(--accent)] opacity-20" />
            <Loader2 className="absolute inset-0 h-10 w-10 animate-spin text-[var(--accent)]" />
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">Analyzing supply data-</p>
          <p className="text-xs text-[var(--foreground-muted)]">Querying vaccination pace, center capacities, and stock levels</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--danger)] mt-0.5" />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {/* AI narrative */}
      {summary && !isPending && (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">AI Analysis</p>
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{summary}</p>
          <p className="mt-3 text-[10px] text-[var(--foreground-muted)]">
            - AI projection based on current vaccination pace. Actual results may vary due to demand changes, supply disruptions, or policy shifts.
          </p>
        </div>
      )}

      {/* Projection cards */}
      {projections.length > 0 && !isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projections.map((p, i) => {
            const pct90 = p.currentStock > 0 ? Math.round((p.days90 / p.currentStock) * 100) : 0;
            const critical = p.days30 === 0;
            return (
              <div key={p.vaccineName} className={cn(
                "rounded-xl border p-4",
                critical ? "border-[var(--danger)] bg-[var(--danger-subtle)]" : "border-[var(--border)] bg-[var(--surface)]"
              )}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-[var(--foreground)]">{p.vaccineName}</p>
                  {critical && <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "30 days", value: p.days30, color: p.days30 < p.currentStock * 0.3 ? "var(--danger)" : "var(--accent)" },
                    { label: "60 days", value: p.days60, color: p.days60 < p.currentStock * 0.2 ? "var(--danger)" : "var(--warning)" },
                    { label: "90 days", value: p.days90, color: p.days90 < p.currentStock * 0.1 ? "var(--danger)" : "var(--foreground-muted)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--background-subtle)] p-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color }}>
                        {value <= 0 ? "0" : formatNumber(value)}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-subtle)]">
                  <div
                    className={cn("h-full rounded-full transition-all", pct90 < 20 ? "bg-[var(--danger)]" : pct90 < 50 ? "bg-[var(--warning)]" : "bg-[var(--accent)]")}
                    style={{ width: `${Math.min(100, pct90)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{pct90}% remaining at 90 days</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Line chart */}
      {projections.length > 0 && !isPending && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">Projected Stock Levels</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatNumber(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {projections.map((p, i) => (
                <Line
                  key={p.vaccineName}
                  type="monotone"
                  dataKey={p.vaccineName}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !summary && !error && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--border)] py-20">
          <Sparkles className="h-10 w-10 text-[var(--foreground-muted)]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">AI Forecast Not Yet Generated</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">Click &quot;Run Forecast&quot; to analyze current supply data with GPT-4o</p>
          </div>
        </div>
      )}
    </div>
  );
}
