"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, Users, Package, ShieldAlert, ChevronRight, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingApprovals } from "@/app/actions/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface ApprovalItem {
  label:    string;
  count:    number;
  icon:     React.ReactNode;
  href:     string;
  critical: boolean;
}

interface PendingApprovalsWidgetProps {
  data: PendingApprovals;
}

export function PendingApprovalsWidget({ data }: PendingApprovalsWidgetProps) {
  const router = useRouter();

  const items: ApprovalItem[] = [
    {
      label:    "Center Applications",
      count:    data.centerApplications,
      icon:     <Building2 className="h-4 w-4" />,
      href:     "/centers?status=PENDING",
      critical: false,
    },
    {
      label:    "Staff Requests",
      count:    data.staffRequests,
      icon:     <Users className="h-4 w-4" />,
      href:     "/staff?status=pending",
      critical: false,
    },
    {
      label:    "Restock Requests",
      count:    data.restockRequests,
      icon:     <Package className="h-4 w-4" />,
      href:     "/supply?filter=low_stock",
      critical: data.restockRequests > 10,
    },
    {
      label:    "Fraud Escalations",
      count:    data.fraudEscalations,
      icon:     <ShieldAlert className="h-4 w-4" />,
      href:     "/fraud?severity=CRITICAL",
      critical: data.fraudEscalations > 0,
    },
  ];

  const totalPending = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <ClipboardList className="h-4 w-4 text-[var(--amber-500)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Pending Approvals
        </span>
        {totalPending > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--amber-500)] px-1.5 text-[10px] font-bold text-white">
            {totalPending}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-[var(--border)]">
        {items.map(({ label, count, icon, href, critical }, i) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => router.push(href)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--background-subtle)]"
          >
            {/* Icon */}
            <div className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
              critical
                ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
                : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
            )}>
              {icon}
            </div>

            {/* Label */}
            <span className="flex-1 text-sm text-[var(--foreground)]">{label}</span>

            {/* Count badge */}
            <span className={cn(
              "flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold",
              count === 0
                ? "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
                : critical
                  ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
                  : "bg-[var(--accent-subtle)] text-[var(--accent)]"
            )}>
              {count}
            </span>

            <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          View all pending actions -
        </button>
      </div>
    </div>
  );
}

/* --- Skeleton ----------------------------------------------------------------- */
export function PendingApprovalsSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
