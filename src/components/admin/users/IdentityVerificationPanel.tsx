"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldAlert, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { verifyIdentity } from "@/app/actions/users";

interface Props {
  citizenId:  string;
  isVerified: boolean;
  onUpdated:  () => void;
}

export function IdentityVerificationPanel({ citizenId, isVerified, onUpdated }: Props) {
  const [status,    setStatus]    = useState<"VERIFIED" | "FLAGGED">(isVerified ? "VERIFIED" : "FLAGGED");
  const [reason,    setReason]    = useState("");
  const [docName,   setDocName]   = useState("");
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!reason.trim()) { setError("Reason is required"); return; }
    setError("");
    startTransition(async () => {
      const res = await verifyIdentity(citizenId, { status, reason });
      if (!res.ok) { setError(res.error); return; }
      onUpdated();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">Identity Verification</p>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
          isVerified
            ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
            : "bg-[var(--warning-subtle)] text-[var(--warning)]"
        )}>
          {isVerified ? "Verified" : "Unverified"}
        </span>
      </div>

      {/* Status toggle */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Override Status</label>
        <div className="grid grid-cols-2 gap-2">
          {(["VERIFIED", "FLAGGED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-xs font-semibold transition-all",
                status === s
                  ? s === "VERIFIED"
                    ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]"
              )}
            >
              {s === "VERIFIED"
                ? <ShieldCheck className="h-4 w-4" />
                : <ShieldAlert className="h-4 w-4" />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for this override-"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {/* Document upload (UI only - wire to storage in production) */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Supporting Document</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--foreground-muted)] hover:border-[var(--accent)] transition-colors">
          <Upload className="h-4 w-4" />
          {docName || "Click to upload (PDF, JPG, PNG)"}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setDocName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <Button
        onClick={handleSave}
        disabled={isPending || !reason.trim()}
        className="w-full bg-[var(--accent)] text-white hover:opacity-90"
        size="sm"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Verification Override
      </Button>
    </div>
  );
}
