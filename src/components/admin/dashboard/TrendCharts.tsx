"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyTrendRow, VaccineDistributionRow } from "@/services/adminStatsService";
import { Skeleton } from "@/components/ui/skeleton";

/* --- Custom tooltip ----------------------------------------------------------- */
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-[var(--foreground-muted)]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {new Intl.NumberFormat("en-US").format(p.value)}
          <span className="ml-1 text-xs font-normal text-[var(--foreground-muted)]">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

/* --- Trend line chart --------------------------------------------------------- */
type TrendView = "national" | "division";

const DIVISION_COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

interface TrendChartProps {
  data: DailyTrendRow[];
}

export function TrendChart({ data }: TrendChartProps) {
  const [view, setView] = useState<TrendView>("national");

  /* Format date labels: show only every 5th day */
  const formatted = data.map((d, i) => ({
    ...d,
    label: i % 5 === 0 ? d.date.slice(5) : "",   /* "MM-DD" */
  }));

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--health-green-500)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Daily Vaccinations - Last 30 Days
          </span>
        </div>
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {(["national", "division"] as TrendView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                view === v
                  ? "bg-[var(--health-green-500)] text-white shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              name="doses"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#greenGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --- Vaccine distribution bar chart ------------------------------------------ */
interface VaccineChartProps {
  data: VaccineDistributionRow[];
}

export function VaccineDistributionChart({ data }: VaccineChartProps) {
  const chartData = data.map((d) => ({
    name:   d.shortName,
    doses:  d.totalDoses,
    pct:    d.percent,
  }));

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <BarChart2 className="h-4 w-4 text-[var(--blue-500)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Vaccine Type Distribution
        </span>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<ChartTooltip />} />
            {chartData.map((_, i) => null) /* satisfy lint */}
            <Bar
              dataKey="doses"
              name="doses"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {chartData.map((_, i) => (
                <motion.rect
                  key={i}
                  initial={{ scaleY: 0, originY: 1 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
                  fill={DIVISION_COLORS[i % DIVISION_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {data.map((d, i) => (
            <div key={d.vaccineId} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: DIVISION_COLORS[i % DIVISION_COLORS.length] }}
              />
              <span className="text-[10px] text-[var(--foreground-muted)]">
                {d.shortName} ({d.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- Skeletons ---------------------------------------------------------------- */
export function TrendChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-[260px] w-full" />
        </div>
      ))}
    </div>
  );
}
