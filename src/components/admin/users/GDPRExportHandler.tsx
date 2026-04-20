"use client";

import { useState, useTransition } from "react";
import { Download, FileArchive, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDataExport } from "@/app/actions/users";

interface Props {
  citizenId:   string;
  citizenName: string;
}

export function GDPRExportHandler({ citizenId, citizenName }: Props) {
  const [result,    setResult]    = useState<{ token: string; expiresAt: string } | null>(null);
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(""); setResult(null);
    startTransition(async () => {
      const res = await generateDataExport(citizenId);
      if (!res.ok) { setError(res.error); return; }
      setResult(res.data);
    });
  }

  const downloadUrl = result
    ? `/api/admin/users/export?token=${result.token}`
    : null;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2">
        <FileArchive className="h-4 w-4 text-[var(--foreground-muted)]" />
        <p className="text-sm font-semibold text-[var(--foreground)]">GDPR Data Export</p>
      </div>

      <p className="text-xs text-[var(--foreground-muted)]">
        Generates a ZIP containing <code className="rounded bg-[var(--background-subtle)] px-1">personal_info.json</code>,{" "}
        <code className="rounded bg-[var(--background-subtle)] px-1">vaccination_records.csv</code>,{" "}
        <code className="rounded bg-[var(--background-subtle)] px-1">appointments.csv</code>, and{" "}
        <code className="rounded bg-[var(--background-subtle)] px-1">health_reports.csv</code> for{" "}
        <strong>{citizenName}</strong>. Download link expires in 24 hours.
      </p>

      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-3">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--accent)]">Export ready</p>
              <p className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                <Clock className="h-3 w-3" />
                Expires {new Date(result.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
          <a href={downloadUrl!} download>
            <Button size="sm" className="w-full bg-[var(--accent)] text-white hover:opacity-90">
              <Download className="h-4 w-4" /> Download ZIP
            </Button>
          </a>
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setResult(null)}>
            Generate New Export
          </Button>
        </div>
      ) : (
        <>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Generate Export
          </Button>
        </>
      )}
    </div>
  );
}
