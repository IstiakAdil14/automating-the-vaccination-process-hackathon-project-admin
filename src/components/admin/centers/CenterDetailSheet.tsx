"use client";

import { useEffect, useState, useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Phone, Mail, Clock, Users, Package,
  TrendingUp, ShieldAlert, Edit, Ban, CheckCircle2, Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CenterEditDialog } from "./CenterEditDialog";
import { SuspendDialog } from "./SuspendDialog";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { reactivateCenter } from "@/app/actions/centers";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import type { Center, Staff, InventoryItem } from "@/types";

/* --- Detail data shape -------------------------------------------------------- */
interface CenterDetail {
  center:     Center;
  staff:      Staff[];
  inventory:  InventoryItem[];
  trend:      { _id: string; count: number }[];
  fraudCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-[var(--accent-subtle)] text-[var(--accent)]",
  PENDING:   "bg-[var(--warning-subtle)] text-[var(--warning-foreground)]",
  SUSPENDED: "bg-[var(--danger-subtle)] text-[var(--danger)]",
};

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* --- CenterDetailSheet -------------------------------------------------------- */
interface Props {
  centerId: string | null;
  onClose:  () => void;
  onUpdate: () => void;
}

export function CenterDetailSheet({ centerId, onClose, onUpdate }: Props) {
  const [detail,      setDetail]      = useState<CenterDetail | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [isPending,   startTransition] = useTransition();

  /* Optimistic status */
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    detail?.center.status ?? "ACTIVE"
  );

  useEffect(() => {
    if (!centerId) { setDetail(null); return; }
    setLoading(true);
    fetch(`/api/admin/centers/${centerId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [centerId]);

  function handleReactivate() {
    if (!centerId) return;
    startTransition(async () => {
      setOptimisticStatus("ACTIVE");
      await reactivateCenter(centerId);
      onUpdate();
      setDetail((d) => d ? { ...d, center: { ...d.center, status: "ACTIVE" } } : d);
    });
  }

  const center = detail?.center;

  return (
    <>
      <Sheet open={!!centerId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full max-w-2xl">
          <SheetHeader>
            {loading || !center ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start justify-between pr-10">
                <div>
                  <SheetTitle>{center.name}</SheetTitle>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{center.licenseNo}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[optimisticStatus])}>
                  {optimisticStatus}
                </span>
              </div>
            )}
          </SheetHeader>

          {/* Action buttons */}
          {center && (
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-3">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              {optimisticStatus === "SUSPENDED" ? (
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

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : center && detail ? (
              <Tabs defaultValue="overview" className="h-full">
                <div className="px-6 pt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview"    className="flex-1 text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="staff"       className="flex-1 text-xs">Staff ({detail.staff.length})</TabsTrigger>
                    <TabsTrigger value="inventory"   className="flex-1 text-xs">Inventory</TabsTrigger>
                    <TabsTrigger value="performance" className="flex-1 text-xs">Performance</TabsTrigger>
                    <TabsTrigger value="audit"       className="flex-1 text-xs">Audit</TabsTrigger>
                  </TabsList>
                </div>

                {/* -- Overview -- */}
                <TabsContent value="overview" className="space-y-5 p-6">
                  {/* Static map */}
                  <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${center.geoLat},${center.geoLng}&zoom=14&size=600x200&markers=color:green%7C${center.geoLat},${center.geoLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                      alt="Center location"
                      className="h-40 w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: MapPin,   label: "Address",  value: center.address.full },
                      { icon: Phone,    label: "Phone",    value: center.contact.phone },
                      { icon: Mail,     label: "Email",    value: center.contact.email ?? "-" },
                      { icon: Users,    label: "Capacity", value: `${center.dailyCapacity} doses/day` },
                      { icon: TrendingUp, label: "Total Vaccinations", value: formatNumber(center.totalVaccinations) },
                      { icon: ShieldAlert, label: "Open Fraud Alerts", value: String(detail.fraudCount) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                        <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-[var(--foreground)] break-words">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Operating hours */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                      <Clock className="h-3.5 w-3.5" /> Operating Hours
                    </p>
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      {center.operatingHours?.length ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                              <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Day</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Morning</th>
                              <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Evening</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {center.operatingHours.map((h) => (
                              <tr key={h.day}>
                                <td className="px-3 py-2 font-medium">{DAY_NAMES[h.day]}</td>
                                <td className="px-3 py-2 text-[var(--foreground-muted)]">
                                  {h.morningStart && h.morningEnd ? `${h.morningStart}-${h.morningEnd}` : "-"}
                                </td>
                                <td className="px-3 py-2 text-[var(--foreground-muted)]">
                                  {h.eveningStart && h.eveningEnd ? `${h.eveningStart}-${h.eveningEnd}` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="px-4 py-3 text-xs text-[var(--foreground-muted)]">No operating hours configured</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* -- Staff -- */}
                <TabsContent value="staff" className="p-6">
                  <div className="space-y-2">
                    {detail.staff.length === 0 ? (
                      <p className="text-sm text-[var(--foreground-muted)]">No staff assigned</p>
                    ) : detail.staff.map((s) => (
                      <div key={s._id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{s.name}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{s.role} - {s.email}</p>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          s.isActive ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
                        )}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* -- Inventory -- */}
                <TabsContent value="inventory" className="p-6">
                  <div className="space-y-2">
                    {detail.inventory.length === 0 ? (
                      <p className="text-sm text-[var(--foreground-muted)]">No inventory records</p>
                    ) : detail.inventory.map((item) => (
                      <div key={item._id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{item.vaccineId}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">Batch: {item.batchNo} - Expires: {formatDate(item.expiryDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-bold", item.isLowStock ? "text-[var(--danger)]" : "text-[var(--accent)]")}>
                            {item.quantityOnHand}
                          </p>
                          <p className="text-[10px] text-[var(--foreground-muted)]">in stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* -- Performance -- */}
                <TabsContent value="performance" className="p-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Daily Vaccinations - Last 30 Days
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={detail.trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="_id" tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} fill="url(#perfGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                {/* -- Audit -- */}
                <TabsContent value="audit" className="p-6">
                  <div className="space-y-3">
                    {[
                      { label: "Center registered",   date: center.createdAt,   color: "var(--info)" },
                      center.approvedAt && { label: "Application approved", date: center.approvedAt, color: "var(--accent)" },
                      center.status === "SUSPENDED" && { label: `Suspended: ${center.suspendedReason ?? ""}`, date: center.createdAt, color: "var(--danger)" },
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

      {/* Edit dialog */}
      {center && (
        <CenterEditDialog
          center={center}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); onUpdate(); }}
        />
      )}

      {/* Suspend dialog */}
      {center && (
        <SuspendDialog
          centerId={center._id}
          open={suspendOpen}
          onClose={() => setSuspendOpen(false)}
          onSuspended={() => {
            setSuspendOpen(false);
            setOptimisticStatus("SUSPENDED");
            onUpdate();
          }}
        />
      )}
    </>
  );
}
