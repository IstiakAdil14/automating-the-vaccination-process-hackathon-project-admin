"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Syringe, Building2, Users, TrendingUp, TrendingDown,
  Activity, Wifi,
} from "lucide-react";
import { Sparklines, SparklinesLine, SparklinesReferenceLine } from "react-sparklines";
import { cn } from "@/lib/utils";
import type { NationalKPIs } from "@/services/adminStatsService";
import type { DailyTrendRow } from "@/services/adminStatsService";
import { Skeleton } from "@/components/ui/skeleton";

/* --- Animated counter hook --------------------------------------------------- */
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      /* Ease-out cubic */
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* --- Circular SVG progress ring ---------------------------------------------- */
function CoverageRing({ percent }: { percent: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const animated = useCountUp(percent, 1600);
  const offset = circ - (animated / 100) * circ;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="var(--health-green-500)" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-[var(--foreground)]">
        {animated}%
      </span>
    </div>
  );
}

/* --- Individual KPI card ------------------------------------------------------ */
interface KpiCardProps {
  title:       string;
  value:       number;
  format?:     "number" | "percent";
  icon:        React.ReactNode;
  accentColor: string;
  iconBg:      string;
  change?:     number;        /* % change vs yesterday */
  suffix?:     string;
  extra?:      React.ReactNode;
  index:       number;
}

function KpiCard({
  title, value, format = "number", icon, accentColor,
  iconBg, change, suffix, extra, index,
}: KpiCardProps) {
  const counted = useCountUp(value, 1200 + index * 100);
  const formatted = format === "number"
    ? new Intl.NumberFormat("en-US").format(counted)
    : `${counted}%`;

  const isUp   = change !== undefined && change >= 0;
  const isDown = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="card-hover relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
    >
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accentColor }} />

      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.06] blur-2xl"
        style={{ background: accentColor }}
      />

      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              {title}
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {formatted}
              </span>
              {suffix && (
                <span className="mb-0.5 text-sm text-[var(--foreground-muted)]">{suffix}</span>
              )}
            </div>

            {/* Change indicator */}
            {change !== undefined && (
              <div className={cn(
                "mt-1.5 flex items-center gap-1 text-xs font-medium",
                isUp   ? "text-[var(--health-green-500)]" : "text-[var(--red-500)]"
              )}>
                {isUp
                  ? <TrendingUp  className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />
                }
                <span>{isUp ? "+" : ""}{change}% vs yesterday</span>
              </div>
            )}

            {extra && <div className="mt-2">{extra}</div>}
          </div>

          {/* Icon */}
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* --- Sparkline mini-chart ----------------------------------------------------- */
function SparklineChart({ data }: { data: number[] }) {
  return (
    <div className="h-8 w-24">
      <Sparklines data={data} margin={2}>
        <SparklinesLine color="var(--health-green-500)" style={{ fill: "none", strokeWidth: 1.5 }} />
        <SparklinesReferenceLine type="mean" style={{ stroke: "var(--border)", strokeDasharray: "2,2" }} />
      </Sparklines>
    </div>
  );
}

/* --- KPI Row ------------------------------------------------------------------ */
interface KpiRowProps {
  kpis:       NationalKPIs;
  dailyTrend: DailyTrendRow[];
}

export function KpiRow({ kpis, dailyTrend }: KpiRowProps) {
  const sparkData = dailyTrend.slice(-14).map((d) => d.count);

  /* Yesterday's doses (second-to-last day in trend) */
  const todayDoses     = dailyTrend.at(-1)?.count ?? 0;
  const yesterdayDoses = dailyTrend.at(-2)?.count ?? 0;
  const dailyChange    = yesterdayDoses > 0
    ? Math.round(((todayDoses - yesterdayDoses) / yesterdayDoses) * 100)
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {/* 1 - Total doses */}
      <KpiCard
        index={0}
        title="Total Doses Administered"
        value={kpis.vaccinationsThisMonth}
        icon={<Syringe className="h-6 w-6 text-[var(--health-green-500)]" />}
        accentColor="var(--health-green-500)"
        iconBg="rgba(16,185,129,0.1)"
        change={dailyChange}
        suffix="this month"
      />

      {/* 2 - Coverage ring */}
      <KpiCard
        index={1}
        title="Population Vaccinated"
        value={kpis.coveragePercent}
        format="percent"
        icon={<CoverageRing percent={kpis.coveragePercent} />}
        accentColor="var(--blue-500)"
        iconBg="transparent"
        extra={
          <p className="text-[10px] text-[var(--foreground-muted)]">
            {new Intl.NumberFormat("en-US").format(kpis.totalVaccinated)} complete
          </p>
        }
      />

      {/* 3 - Active centers */}
      <KpiCard
        index={2}
        title="Active Centers Nationwide"
        value={kpis.activeCenters}
        icon={<Building2 className="h-6 w-6 text-[var(--blue-500)]" />}
        accentColor="var(--blue-500)"
        iconBg="rgba(59,130,246,0.1)"
        change={0}
        suffix={`of ${kpis.totalCenters}`}
      />

      {/* 4 - Active staff */}
      <KpiCard
        index={3}
        title="Active Staff Count"
        value={kpis.activeStaff}
        icon={<Users className="h-6 w-6 text-[var(--amber-500)]" />}
        accentColor="var(--amber-500)"
        iconBg="rgba(245,158,11,0.1)"
        extra={
          <div className="flex items-center gap-1.5">
            <span className="status-dot status-dot-green" />
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {Math.round(kpis.activeStaff * 0.3)} online now
            </span>
          </div>
        }
      />

      {/* 5 - Daily rate sparkline */}
      <KpiCard
        index={4}
        title="Daily Vaccination Rate"
        value={kpis.vaccinationsToday}
        icon={<Activity className="h-6 w-6 text-[var(--health-green-400)]" />}
        accentColor="var(--health-green-400)"
        iconBg="rgba(52,211,153,0.1)"
        change={dailyChange}
        extra={<SparklineChart data={sparkData} />}
      />
    </div>
  );
}

/* --- Skeleton ----------------------------------------------------------------- */
export function KpiRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
