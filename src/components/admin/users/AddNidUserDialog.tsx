"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNidUser } from "@/app/actions/users";

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

export function AddNidUserDialog({ open, onClose, onCreated }: Props) {
  const [nid, setNid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await addNidUser({ nid });
      if (!res.ok) { setError(res.error ?? "Failed"); return; }
      setNid("");
      onCreated();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Approved NID</DialogTitle>
        </DialogHeader>

        <div className="px-1 py-2">
          <p className="mb-3 text-xs text-[var(--foreground-muted)]">
            Pre-approve a National ID so the citizen can register an account. Only approved NIDs can sign up.
          </p>
          <label className="text-xs text-[var(--foreground-muted)] mb-1 block">NID Number *</label>
          <Input
            placeholder="10 or 13 digit NID"
            value={nid}
            onChange={(e) => setNid(e.target.value.replace(/\D/g, ""))}
            maxLength={13}
          />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending || nid.length < 10}>
            {pending ? "Saving…" : "Approve NID"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
