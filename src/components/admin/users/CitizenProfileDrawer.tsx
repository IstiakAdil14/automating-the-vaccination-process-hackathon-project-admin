"use client";

import { useEffect, useState, useTransition } from "react";
import {
  User, Syringe, Calendar, Heart, Shield, Users,
  ShieldCheck, ShieldAlert, Ban, Download, Loader2, CheckCircle2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { getCitizenProfile } from "@/app/actions/users";
import { IdentityVerificationPanel } from "./IdentityVerificationPanel";
import { GDPRExportHandler } from "./GDPRExportHandler";
import { AccountSuspendDialog } from "./AccountSuspendDialog";
import type { CitizenProfile } from "@/app/actions/users";

const VAX_STATUS_STYLES: Record<string, string> = {
  UNVACCINATED: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  PARTIAL:      "bg-[var(--warning-subtle)] text-[var(--warning)]",
  COMPLETE:     "bg-[var(--accent-subtle)] text-[var(--accent)]",
};

interface Props {
  citizenId: string | null;
  onClose:   () => void;
  onUpdate:  () => void;
}

export function CitizenProfileDrawer({ citizenId, onClose, onUpdate }: Props) {
  const [profile,      setProfile]      = useState<CitizenProfile | null>(null);
  const [vaccinations, setVaccinations] = useState<object[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [suspendOpen,  setSuspendOpen]  = useState(false);
  const [verifyOpen,   setVerifyOpen]   = useState(false);
  const [, startTransition]             = useTransition();

  useEffect(() => {
    if (!citizenId) { setProfile(null); return; }
    setLoading(true);
    startTransition(async () => {
      const res = await getCitizenProfile(citizenId);
      if (res.ok) {
        setProfile(res.data.profile);
        setVaccinations(res.data.vaccinations);
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenId]);

  function refresh() {
    if (!citizenId) return;
    setLoading(true);
    startTransition(async () => {
      const res = await getCitizenProfile(citizenId);
      if (res.ok) { setProfile(res.data.profile); setVaccinations(res.data.vaccinations); }
      setLoading(false);
      onUpdate();
    });
  }

  return (
    <>
      <Sheet open={!!citizenId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="flex w-full max-w-2xl flex-col p-0 sm:max-w-2xl">
          {/* Header */}
          <SheetHeader className="border-b border-[var(--border)] px-6 py-4">
            {loading || !profile ? (
              <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-28" /></div>
            ) : (
              <div className="flex items-center gap-4 pr-8">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--background-subtle)] text-xl font-bold text-[var(--foreground-muted)]">
                  {profile.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{profile.name}</SheetTitle>
                  <p className="text-xs text-[var(--foreground-muted)]">{profile.userId}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", VAX_STATUS_STYLES[profile.vaccinationStatus])}>
                    {profile.vaccinationStatus}
                  </span>
                  {profile.isVerified
                    ? <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)]"><CheckCircle2 className="h-3 w-3" />Verified</span>
                    : <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--warning)]"><ShieldAlert className="h-3 w-3" />Unverified</span>}
                </div>
              </div>
            )}
          </SheetHeader>

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-4 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : profile ? (
              <Tabs defaultValue="personal" className="h-full">
                <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-6 pt-3">
                  <TabsList className="h-auto w-full flex-wrap gap-1 bg-transparent p-0">
                    {[
                      { value: "personal",    label: "Personal",   icon: User },
                      { value: "family",      label: "Family",     icon: Users },
                      { value: "vaccinations",label: "Vaccines",   icon: Syringe },
                      { value: "appointments",label: "Appointments",icon: Calendar },
                      { value: "health",      label: "Health",     icon: Heart },
                      { value: "audit",       label: "Audit",      icon: Shield },
                    ].map(({ value, label, icon: Icon }) => (
                      <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-[var(--background-subtle)]">
                        <Icon className="h-3.5 w-3.5" />{label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* -- Personal Info -- */}
                <TabsContent value="personal" className="space-y-4 p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Full Name",   value: profile.name },
                      { label: "NID",         value: profile.nid },
                      { label: "Phone",       value: profile.phone },
                      { label: "Email",       value: profile.email ?? "-" },
                      { label: "Date of Birth", value: formatDate(profile.dateOfBirth) },
                      { label: "Gender",      value: profile.gender },
                      { label: "Division",    value: profile.division },
                      { label: "District",    value: profile.district },
                      { label: "Upazila",     value: profile.upazila },
                      { label: "Registered",  value: formatDate(profile.createdAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
                        <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{value}</p>
                      </div>
                    ))}
                  </div>
                  {profile.isSuspended && (
                    <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--danger)]">Suspension Reason</p>
                      <p className="text-sm text-[var(--danger)]">{profile.suspendedReason}</p>
                    </div>
                  )}
                </TabsContent>

                {/* -- Family Members -- */}
                <TabsContent value="family" className="p-6">
                  <p className="text-sm text-[var(--foreground-muted)]">Family member data will appear here when the FamilyMember model is integrated.</p>
                </TabsContent>

                {/* -- Vaccination History -- */}
                <TabsContent value="vaccinations" className="p-6">
                  {vaccinations.length === 0 ? (
                    <p className="text-sm text-[var(--foreground-muted)]">No vaccination records found.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                            {["Vaccine", "Dose", "Center", "Date", "Batch"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {(vaccinations as Record<string, unknown>[]).map((v, i) => (
                            <tr key={i} className="hover:bg-[var(--background-subtle)]">
                              <td className="px-3 py-2">{String((v.vaccineId as Record<string,unknown>)?.shortName ?? "-")}</td>
                              <td className="px-3 py-2">Dose {String(v.doseNumber ?? "-")}</td>
                              <td className="px-3 py-2">{String((v.centerId as Record<string,unknown>)?.name ?? "-")}</td>
                              <td className="px-3 py-2">{formatDate(String(v.administeredAt ?? ""))}</td>
                              <td className="px-3 py-2 font-mono">{String(v.batchNo ?? "-")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* -- Appointments -- */}
                <TabsContent value="appointments" className="p-6">
                  <p className="text-sm text-[var(--foreground-muted)]">Appointment history will appear here when the Appointment model is integrated.</p>
                </TabsContent>

                {/* -- Health Reports -- */}
                <TabsContent value="health" className="p-6">
                  <p className="text-sm text-[var(--foreground-muted)]">Side-effect submissions will appear here when the HealthReport model is integrated.</p>
                </TabsContent>

                {/* -- Audit -- */}
                <TabsContent value="audit" className="space-y-3 p-6">
                  {[
                    { label: "Account registered", date: profile.createdAt, color: "var(--info)" },
                    profile.isVerified && { label: "Identity verified", date: profile.createdAt, color: "var(--accent)" },
                    profile.isSuspended && { label: `Suspended: ${profile.suspendedReason ?? ""}`, date: profile.createdAt, color: "var(--danger)" },
                  ].filter(Boolean).map((ev, i) => ev && (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ev.color }} />
                      <div>
                        <p className="text-sm text-[var(--foreground)]">{ev.label}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{formatDate(ev.date)}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            ) : null}
          </div>

          {/* Admin action panel */}
          {profile && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Admin Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setVerifyOpen(true)} className="text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" /> Verify Identity
                </Button>
                {profile.isSuspended ? (
                  <Button size="sm" variant="outline" onClick={refresh} className="text-xs text-[var(--accent)]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)} className="text-xs text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                    <Ban className="h-3.5 w-3.5" /> Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs ml-auto">
                  <Download className="h-3.5 w-3.5" /> Export Data
                </Button>
              </div>

              {/* Inline panels toggled by buttons */}
              {verifyOpen && (
                <div className="mt-4">
                  <IdentityVerificationPanel
                    citizenId={profile._id}
                    isVerified={profile.isVerified}
                    onUpdated={() => { setVerifyOpen(false); refresh(); }}
                  />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {profile && (
        <>
          <AccountSuspendDialog
            citizenId={profile._id}
            citizenName={profile.name}
            open={suspendOpen}
            onClose={() => setSuspendOpen(false)}
            onSuspended={() => { setSuspendOpen(false); refresh(); }}
          />
        </>
      )}
    </>
  );
}
