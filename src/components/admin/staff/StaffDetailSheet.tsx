"use client";

import { useEffect, useState, useOptimistic, useTransition } from "react";
import {
  User, TrendingUp, Activity, Shield,
  Ban, CheckCircle2, Loader2, Syringe, Calendar,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffSuspendDialog } from "./StaffSuspendDialog";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { reactivateStaff } from "@/app/actions/staff";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

/* --- Types -------------------------------------------------------------------- */
interface StaffDetail {
  staff: {
    _id: string; staffId: string; name: string; nid: string; email: string;
    phone: string; role: string;
    centerId: { name: string; address: { division: string; district: string } };
    isActive: boolean; isSuspended: boolean; suspendedReason?: string;
    totalVaccinations: number; shiftsWorked: number;
    lastActive?: string; createdAt: string;
  };
  performance: {
    vaccinationsThisWeek: number; vaccinationsThisMonth: number;
    vaccinationsTotal: number; shiftsWorked: number;
  };
  recentRecords: {
    _id: string; administeredAt: string; doseNumber: number;
    userId: { name: string; nid: string };
    vaccineId: { name: string; shortName: string };
  }[];
}

const ROLE_COLORS: Record<string, string> = {
  VACCINATOR:   "bg-[var(--accent-subtle)] text-[var(--accent)]",
  RECEPTIONIST: "bg-[var(--info-subtle)] text-[var(--info)]",
  SUPERVISOR:   "bg-purple-50 text-purple-700",
};

/* --- StaffDetailSheet --------------------------------------------------------- */
interface Props { staffId: string | null; onClose: () => void; onUpdate: () => void }

export function StaffDetailSheet({ staffId, onClose, onUpdate }: Props) {
  const [detail,       setDetail]       = useState<StaffDetail | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [suspendOpen,  setSuspendOpen]  = useState(false);
  const [isPending,    startTransition] = useTransition();

  const [optimisticSuspended, setOptimisticSuspended] = useOptimistic(
    detail?.staff.isSuspended ?? false
  );

  useEffect(() => {
    if (!staffId) { setDetail(null); return; }
    setLoading(true);
    fetch(`/api/admin/staff/${staffId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId]);

  function handleReactivate() {
    if (!staffId) return;
    startTransition(async () => {
      setOptimisticSuspended(false);
      await reactivateStaff(staffId);
      onUpdate();
      setDetail((d) => d ? { ...d, staff: { ...d.staff, isSuspended: false, isActive: true } } : d);
    });
  }

  const staff = detail?.staff;

  /* Build sparkline data from recent records grouped by date */
  const sparkData = (() => {
    if (!detail?.recentRecords.length) return [];
    const map = new Map<string, number>();
    detail.recentRecords.forEach((r) => {
      const d = r.administeredAt.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count })).slice(-14);
  })();

  return (
    <>
      <Sheet open={!!staffId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right">
          <SheetHeader>
            {loading || !staff ? (
              <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-28" /></div>
            ) : (
              <div className="flex items-start justify-between pr-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background-subtle)] text-xl font-bold text-[var(--foreground-muted)]">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <SheetTitle>{staff.name}</SheetTitle>
                    <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{staff.staffId}</p>
                  </div>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ROLE_COLORS[staff.role] ?? "")}>
                  {staff.role}
                </span>
              </div>
            )}
          </SheetHeader>

          {/* Action buttons */}
          {staff && (
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-3">
              {optimisticSuspended ? (
                <Button size="sm" variant="outline" onClick={handleReactivate} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)}
                  className="text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-4 p-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : staff && detail ? (
              <Tabs defaultValue="profile" className="h-full">
                <div className="px-6 pt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="profile"     className="flex-1 text-xs"><User className="h-3.5 w-3.5 mr-1" />Profile</TabsTrigger>
                    <TabsTrigger value="performance" className="flex-1 text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" />Performance</TabsTrigger>
                    <TabsTrigger value="activity"    className="flex-1 text-xs"><Activity className="h-3.5 w-3.5 mr-1" />Activity</TabsTrigger>
                    <TabsTrigger value="audit"       className="flex-1 text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Audit</TabsTrigger>
                  </TabsList>
                </div>

                {/* -- Profile -- */}
                <TabsContent value="profile" className="space-y-4 p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "NID",      value: staff.nid },
                      { label: "Phone",    value: staff.phone },
                      { label: "Email",    value: staff.email },
                      { label: "Center",   value: staff.centerId?.name ?? "-" },
                      { label: "Division", value: staff.centerId?.address?.division ?? "-" },
                      { label: "Joined",   value: formatDate(staff.createdAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
                        <p className="mt-1 text-sm font-medium text-[var(--foreground)] break-all">{value}</p>
                      </div>
                    ))}
                  </div>
                  {staff.isSuspended && staff.suspendedReason && (
                    <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4">
                      <p className="text-xs font-semibold text-[var(--danger)] uppercase tracking-wider mb-1">Suspension Reason</p>
                      <p className="text-sm text-[var(--danger-foreground)]">{staff.suspendedReason}</p>
                    </div>
                  )}
                </TabsContent>

                {/* -- Performance -- */}
                <TabsContent value="performance" className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "This Week",  value: detail.performance.vaccinationsThisWeek,  color: "var(--accent)" },
                      { label: "This Month", value: detail.performance.vaccinationsThisMonth, color: "var(--blue-500)" },
                      { label: "Total",      value: detail.performance.vaccinationsTotal,      color: "var(--amber-500)" },
                      { label: "Shifts",     value: detail.performance.shiftsWorked,           color: "var(--foreground-muted)" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-[var(--border)] p-4 text-center">
                        <p className="text-2xl font-bold" style={{ color }}>{formatNumber(value)}</p>
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {sparkData.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Recent Activity</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} fill="url(#staffGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </TabsContent>

                {/* -- Activity -- */}
                <TabsContent value="activity" className="p-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Last 20 Vaccination Records
                  </p>
                  <div className="space-y-2">
                    {detail.recentRecords.length === 0 ? (
                      <p className="text-sm text-[var(--foreground-muted)]">No records found</p>
                    ) : detail.recentRecords.map((rec) => (
                      <div key={rec._id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Syringe className="h-4 w-4 text-[var(--accent)]" />
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">{rec.userId?.name ?? "-"}</p>
                            <p className="text-xs text-[var(--foreground-muted)]">
                              {rec.vaccineId?.shortName} - Dose {rec.doseNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                          <Calendar className="h-3 w-3" />
                          {formatDate(rec.administeredAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* -- Audit -- */}
                <TabsContent value="audit" className="p-6">
                  <div className="space-y-3">
                    {[
                      { label: "Account created",   date: staff.createdAt,   color: "var(--info)" },
                      staff.lastActive && { label: "Last active",          date: staff.lastActive,  color: "var(--accent)" },
                      staff.isSuspended && { label: `Suspended: ${staff.suspendedReason ?? ""}`, date: staff.createdAt, color: "var(--danger)" },
                    ].filter(Boolean).map((ev, i) => ev && (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ev.color }} />
                        <div>
                          <p className="text-sm text-[var(--foreground)]">{ev.label}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{formatDate(ev.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {staff && (
        <StaffSuspendDialog
          staffId={staff._id}
          staffName={staff.name}
          open={suspendOpen}
          onClose={() => setSuspendOpen(false)}
          onSuspended={() => {
            setSuspendOpen(false);
            setOptimisticSuspended(true);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
