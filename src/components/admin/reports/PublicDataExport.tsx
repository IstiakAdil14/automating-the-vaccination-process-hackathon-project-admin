"use client";

import { useState, useTransition } from "react";
import { Globe, Download, Loader2, CheckCircle2, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePublicExport } from "@/app/actions/reports";

const DATA_DICTIONARY = [
  { field: "Division",       type: "string",  desc: "Administrative division name" },
  { field: "Total Citizens", type: "integer", desc: "Total registered citizens in division" },
  { field: "Vaccinated",     type: "integer", desc: "Citizens with COMPLETE vaccination status" },
  { field: "Partial",        type: "integer", desc: "Citizens with PARTIAL vaccination status" },
  { field: "Coverage %",     type: "float",   desc: "Percentage of citizens vaccinated (complete + partial)" },
  { field: "Vaccine",        type: "string",  desc: "Vaccine product name" },
  { field: "Short Name",     type: "string",  desc: "WHO short code for vaccine" },
  { field: "Total Doses",    type: "integer", desc: "Total doses administered nationwide" },
  { field: "Percent",        type: "float",   desc: "Share of total doses for this vaccine type" },
  { field: "Date",           type: "date",    desc: "ISO 8601 date (YYYY-MM-DD)" },
  { field: "Doses Administered", type: "integer", desc: "Doses given on this date (all centers)" },
];

export function PublicDataExport() {
  const [progress,   setProgress]   = useState(0);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState("");
  const [isPending,  startTransition] = useTransition();

  function generate() {
    setDone(false); setError(""); setProgress(0);

    const steps = [20, 50, 80, 95];
    let i = 0;
    const tick = () => { if (i < steps.length) { setProgress(steps[i++]); setTimeout(tick, 400); } };
    tick();

    startTransition(async () => {
      const res = await generatePublicExport();
      setProgress(100);

      if (res.ok) {
        setDone(true);
        const bytes = Uint8Array.from(atob(res.data.base64), (c) => c.charCodeAt(0));
        const blob  = new Blob([bytes], { type: "text/csv" });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement("a");
        a.href = url; a.download = res.data.filename; a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => { setDone(false); setProgress(0); }, 4000);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
            <Globe className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Public Anonymized Dataset</p>
            <p className="text-xs text-[var(--foreground-muted)]">For researchers, journalists, and public health analysts</p>
          </div>
        </div>

        <div className="mb-5 space-y-2">
          {[
            { icon: Shield, text: "No PII - all data is aggregated at division/date level" },
            { icon: FileText, text: "Includes: coverage by division, vaccine distribution, 90-day trend" },
            { icon: Globe, text: "CSV format with embedded data dictionary" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
              <Icon className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
              {text}
            </div>
          ))}
        </div>

        {isPending && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground-muted)]">Generating dataset-</span>
              <span className="font-mono font-semibold text-[var(--accent)]">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-subtle)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {done && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] px-4 py-3 text-sm font-medium text-[var(--accent)]">
            <CheckCircle2 className="h-4 w-4" /> Dataset downloaded successfully
          </div>
        )}

        {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

        <Button
          onClick={generate}
          disabled={isPending}
          className="w-full bg-[var(--accent)] text-white hover:opacity-90"
        >
          {isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating ({progress}%)-</>
            : <><Download className="h-4 w-4" /> Download Public Dataset (CSV)</>}
        </Button>
      </div>

      {/* Data dictionary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">Data Dictionary</p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Field","Type","Description"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {DATA_DICTIONARY.map((row) => (
                <tr key={row.field} className="hover:bg-[var(--background-subtle)]">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[var(--foreground)]">{row.field}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-[var(--background-subtle)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-muted)]">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--foreground-muted)]">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
