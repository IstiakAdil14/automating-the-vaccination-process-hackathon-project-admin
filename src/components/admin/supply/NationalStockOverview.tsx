"use client";

import { useState, useTransition, useEffect } from "react";
import { AlertTriangle, TrendingDown, Package, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatNumber } from "@/lib/utils";
import { getNationalStock, type NationalStockEntry } from "@/app/actions/supply";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

function DaysRemainingBadge({ days }: { days: number }) {
  const cls = days < 7
    ? "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]"
    : days < 30
      ? "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]"
      : "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", cls)}>
      {days < 7 ? "- " : ""}{days}d
    </span>
  );
}

export function NationalStockOverview() {
  const [data,       setData]       = useState<NationalStockEntry[]>([]);
  const [selected,   setSelected]   = useState("all");
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getNationalStock();
      if (res.ok) setData(res.data);
    });
  }, []);

  const filtered = selected === "all" ? data : data.filter((d) => d.vaccineId === selected);
  const chartData = filtered[0]?.trend ?? [];

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Vaccines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vaccines</SelectItem>
            {data.map((d) => (
              <SelectItem key={d.vaccineId} value={d.vaccineId}>{d.vaccineName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-[var(--foreground-muted)]">
          {filtered.length} vaccine type{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Vaccine cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <div
            key={entry.vaccineId}
            className={cn(
              "rounded-xl border p-5 transition-colors",
              entry.outOfStockCenters > 0
                ? "border-[var(--danger)] bg-[var(--danger-subtle)]"
                : entry.lowStockCenters > 0
                  ? "border-[var(--warning)] bg-[var(--warning-subtle)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
            )}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {entry.shortName}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{entry.vaccineName}</p>
              </div>
              <DaysRemainingBadge days={entry.projectedDaysLeft} />
            </div>

            {/* Big metric */}
            <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {formatNumber(entry.totalDoses)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">total doses nationwide</p>

            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="text-[var(--foreground-muted)]">
                Days at current pace:{" "}
                <strong className={cn(
                  entry.projectedDaysLeft < 7 ? "text-[var(--danger)]" :
                  entry.projectedDaysLeft < 30 ? "text-[var(--warning)]" : "text-[var(--accent)]"
                )}>
                  {entry.projectedDaysLeft} days
                </strong>
              </span>
            </div>

            {(entry.lowStockCenters > 0 || entry.outOfStockCenters > 0) && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--warning)]" />
                <p className="text-xs text-[var(--warning-foreground)]">
                  {entry.outOfStockCenters > 0 && `${entry.outOfStockCenters} out of stock - `}
                  {entry.lowStockCenters > 0 && `${entry.lowStockCenters} low stock`}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 60-day trend chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              60-Day National Stock Trend
              {selected !== "all" && ` - ${filtered[0]?.vaccineName}`}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--foreground-muted)" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: string) => v.slice(5)}
                interval={9}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--foreground-muted)" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), "Doses"]}
              />
              <Area type="monotone" dataKey="qty" stroke="#10B981" strokeWidth={2} fill="url(#stockGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.length === 0 && !isPending && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16">
          <Package className="h-8 w-8 text-[var(--foreground-muted)]" />
          <p className="text-sm text-[var(--foreground-muted)]">No inventory data found</p>
        </div>
      )}
    </div>
  );
}
