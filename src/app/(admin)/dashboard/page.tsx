import { Suspense } from "react";
import { getDashboardData } from "@/app/actions/dashboard";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiRow, KpiRowSkeleton } from "@/components/admin/dashboard/KpiRow";
import { TrendChart, VaccineDistributionChart, TrendChartsSkeleton } from "@/components/admin/dashboard/TrendCharts";
import { DivisionCoverageTable, DivisionTableSkeleton } from "@/components/admin/dashboard/DivisionTable";
import { PendingApprovalsWidget, PendingApprovalsSkeleton } from "@/components/admin/dashboard/PendingApprovals";
import { SystemHealthPanel, SystemHealthSkeleton } from "@/components/admin/dashboard/SystemHealth";
import { formatDate } from "@/lib/utils";

/* --- Async data sections ------------------------------------------------------ */
async function DashboardContent() {
  const data = await getDashboardData();

  return (
    <>
      {/* -- KPI Row -- */}
      <KpiRow kpis={data.kpis} dailyTrend={data.dailyTrend} />

      {/* -- Charts + Approvals -- */}
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart data={data.dailyTrend} />
          <VaccineDistributionChart data={data.vaccineDistrib} />
        </div>
        <PendingApprovalsWidget data={data.pendingApprovals} />
      </div>

      {/* -- Division table -- */}
      <DivisionCoverageTable data={data.divisionBreakdown} />

      {/* -- System health -- */}
      <SystemHealthPanel initial={data.systemHealth} />
    </>
  );
}

/* --- Page --------------------------------------------------------------------- */
export default function DashboardPage() {
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="National Dashboard"
        description={`Vaccination overview - ${formatDate(now)}`}
        action={
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <span className="status-dot status-dot-green animate-pulse-slow" />
            <span className="text-xs font-medium text-[var(--foreground-muted)]">Live</span>
          </div>
        }
      />

      <Suspense
        fallback={
          <div className="space-y-5">
            <KpiRowSkeleton />
            <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
              <TrendChartsSkeleton />
              <PendingApprovalsSkeleton />
            </div>
            <DivisionTableSkeleton />
            <SystemHealthSkeleton />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
