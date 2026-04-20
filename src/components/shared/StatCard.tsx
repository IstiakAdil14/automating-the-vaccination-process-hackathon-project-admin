"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "green" | "navy" | "amber" | "red" | "blue";
  index?: number;
}

const colorConfig = {
  green: {
    bar:  "bg-[var(--health-green-500)]",
    icon: "bg-[var(--accent-subtle)] text-[var(--accent)]",
    trend: "text-[var(--accent)]",
  },
  navy: {
    bar:  "bg-[var(--navy-700)]",
    icon: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
    trend: "text-[var(--foreground-muted)]",
  },
  amber: {
    bar:  "bg-[var(--amber-500)]",
    icon: "bg-[var(--warning-subtle)] text-[var(--warning)]",
    trend: "text-[var(--warning-foreground)]",
  },
  red: {
    bar:  "bg-[var(--red-500)]",
    icon: "bg-[var(--danger-subtle)] text-[var(--danger)]",
    trend: "text-[var(--danger-foreground)]",
  },
  blue: {
    bar:  "bg-[var(--blue-500)]",
    icon: "bg-[var(--info-subtle)] text-[var(--info)]",
    trend: "text-[var(--info-foreground)]",
  },
};

export function StatCard({
  title, value, icon: Icon, trend, trendUp, color = "green", index = 0,
}: StatCardProps) {
  const cfg = colorConfig[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      className="card-hover relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
    >
      {/* Accent bar */}
      <div className={cn("stat-accent-bar", cfg.bar)} />

      <div className="flex items-start gap-4 p-5 pt-6">
        <div className={cn("flex-shrink-0 rounded-xl p-2.5", cfg.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--foreground-muted)]">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", cfg.trend)}>
              {trendUp !== undefined && (
                <span>{trendUp ? "-" : "-"} </span>
              )}
              {trend}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
