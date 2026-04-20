"use client";

import { useState, useTransition, useEffect } from "react";
import { ShieldAlert, ShieldCheck, ShieldOff, AlertTriangle, Loader2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { getFraudAlerts, type FraudAlertRow } from "@/app/actions/fraud";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH:     "#F97316",
  MEDIUM:   "#3B82F6",
  LOW:      "#6B7280",
};

interface KPIs {
  totalThisMonth:  number;
  openCases:       number;
  resolvedCases:   number;
  falsePositives:  number;
  topCenter:       string;
  trendData:       { date: string; count: number }[];
  severityBreakdown: { name: string; value: number }[];
}

function computeKPIs(alerts: FraudAlertRow[]): KPIs {
  const now       = new Date();
  const monthAgo  = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = alerts.filter((a) => new Date(a.createdAt) >= monthAgo);

  // Top flagging center
  const centerCounts: Record<string, number> = {};
  alerts.forEach((a) => { centerCounts[a.centerName] = (centerCounts[a.centerName] ?? 0) + 1; });
  const topCenter = Object.entries(centerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  // 30-day trend
  const trendMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  alerts.forEach((a) => {
    const day = a.createdAt.slice(0, 10);
    if (day in trendMap) trendMap[day]++;
  });
  const trendData = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  // Severity breakdown
  const sevMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  alerts.forEach((a) => { sevMap[a.severity] = (sevMap[a.severity] ?? 0) + 1; });
  const severityBreakdown = Object.entries(sevMap).map(([name, value]) => ({ name, value }));

  return {
    totalThisMonth:  thisMonth.length,
    openCases:       alerts.filter((a) => a.status === "OPEN" || a.status === "INVESTIGATING").length,
    resolvedCases:   alerts.filter((a) => a.status === "RESOLVED").length,
    falsePositives:  alerts.filter((a) => a.status === "FALSE_POSITIVE").length,
    topCenter,
    trendData,
    severityBreakdown,
  };
}

export function FraudDashboardKPIs() {
  const [kpis,     setKpis]     = useState<KPIs | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getFraudAlerts({ limit: 500 });
      if (res.ok) setKpis(computeKPIs(res.data.data));
    });
  }, []);

  if (isPending || !kpis) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Flags This Month",  value: kpis.totalThisMonth, icon: ShieldAlert, color: "var(--foreground)" },
    { label: "Open Cases",        value: kpis.openCases,      icon: AlertTriangle, color: kpis.openCases > 10 ? "var(--danger)" : "var(--warning)" },
    { label: "Resolved Cases",    value: kpis.resolvedCases,  icon: ShieldCheck,   color: "var(--accent)" },
    { label: "False Positives",   value: kpis.falsePositives, icon: ShieldOff,     color: "var(--info)" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <p className="text-3xl font-bold tabular-nums" style={{ color }}>{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Top flagging center */}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
        <p className="text-sm text-[var(--foreground-muted)]">
          Top flagging center this period: <strong className="text-[var(--foreground)]">{kpis.topCenter}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 30-day trend */}
        <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">Fraud Events - Last 30 Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={kpis.trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--foreground-muted)" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: string) => v.slice(5)}
                interval={4}
              />
              <YAxis tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, "Events"]}
              />
              <Area type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} fill="url(#fraudGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity pie */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">Severity Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={kpis.severityBreakdown}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {kpis.severityBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? "#6B7280"} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => (
                  <span style={{ color: SEVERITY_COLORS[value] }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
