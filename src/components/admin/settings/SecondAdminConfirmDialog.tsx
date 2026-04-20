"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, Loader2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifySecondAdmin } from "@/app/actions/settings";

interface Props {
  open:        boolean;
  title:       string;
  description: string;
  onConfirmed: (email: string, password: string) => void;
  onCancel:    () => void;
}

export function SecondAdminConfirmDialog({ open, title, description, onConfirmed, onCancel }: Props) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!email || !password) { setError("Both fields are required"); return; }
    setError("");
    startTransition(async () => {
      const res = await verifySecondAdmin(email, password);
      if (!res.ok) { setError(res.error ?? "Verification failed"); return; }
      const e = email; const p = password;
      setEmail(""); setPassword("");
      onConfirmed(e, p);
    });
  }

  function handleCancel() {
    setEmail(""); setPassword(""); setError("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
            <ShieldAlert className="h-5 w-5" /> Second Admin Confirmation Required
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-2">
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-3">
            <p className="text-xs font-semibold text-[var(--danger)]">{title}</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              This action requires verification by a second Super Admin account.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Super Admin Email
            </label>
            <Input
              type="email"
              placeholder="superadmin@health.gov.bd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="--------"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !email || !password}
            className="bg-[var(--danger)] text-white hover:opacity-90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
