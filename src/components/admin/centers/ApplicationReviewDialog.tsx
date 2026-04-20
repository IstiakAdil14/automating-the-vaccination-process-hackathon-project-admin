"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, MapPin, Phone, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { reviewApplication } from "@/app/actions/centers";
import { ApplicationReviewSchema } from "@/lib/schemas/center";
import type { Center } from "@/types";

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function SlaBadge({ createdAt }: { createdAt: string }) {
  const hoursAgo = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000);
  const overSla  = hoursAgo > 48;
  return (
    <span className={cn(
      "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
      overSla
        ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
        : "bg-[var(--warning-subtle)] text-[var(--warning-foreground)]"
    )}>
      <Clock className="h-3 w-3" />
      {hoursAgo < 1 ? "Just now" : `${hoursAgo}h ago`}
      {overSla && " - SLA breached"}
    </span>
  );
}

interface Props {
  center:     Center;
  open:       boolean;
  onClose:    () => void;
  onReviewed: (status: "ACTIVE" | "SUSPENDED") => void;
}

export function ApplicationReviewDialog({ center, open, onClose, onReviewed }: Props) {
  const [action,    setAction]    = useState<"approve" | "reject" | null>(null);
  const [reason,    setReason]    = useState("");
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const payload = action === "approve" ? { action: "approve" as const } : { action: "reject" as const, reason };
    const parsed  = ApplicationReviewSchema.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Invalid"); return; }
    setError("");
    startTransition(async () => {
      const res = await reviewApplication(center._id, parsed.data);
      if (!res.ok) { setError(res.error); return; }
      onReviewed(res.data.status as "ACTIVE" | "SUSPENDED");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <DialogTitle>Review Application</DialogTitle>
            <SlaBadge createdAt={center.createdAt} />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          {/* Center info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin, label: "Address",   value: center.address.full },
              { icon: Phone,  label: "Contact",   value: center.contact.phone },
              { icon: Mail,   label: "Email",     value: center.contact.email ?? "-" },
              { icon: Clock,  label: "Submitted", value: formatDate(center.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>

          {/* Static map */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${center.geoLat},${center.geoLng}&zoom=14&size=600x180&markers=color:red%7C${center.geoLat},${center.geoLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
              alt="Submitted geo-pin"
              className="h-36 w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* Operating hours */}
          {(center.operatingHours?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Operating Hours
              </p>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Day</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Morning</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Evening</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {center.operatingHours?.map((h) => (
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
              </div>
            </div>
          )}

          {/* Action selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAction("approve")}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                action === "approve"
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
              )}
            >
              <CheckCircle2 className="h-5 w-5" /> Approve Application
            </button>
            <button
              onClick={() => setAction("reject")}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                action === "reject"
                  ? "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--danger)]"
              )}
            >
              <XCircle className="h-5 w-5" /> Reject Application
            </button>
          </div>

          {action === "reject" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Rejection Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this application is being rejected (min 10 characters)-"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none resize-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!action || isPending || (action === "reject" && reason.length < 10)}
            className={cn(
              action === "reject"
                ? "bg-[var(--danger)] text-white hover:bg-[var(--red-600)]"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            )}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Select action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
