"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, CheckCircle2, XCircle, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bulkImport } from "@/app/actions/staff";
import { BulkImportRowSchema, type BulkImportRow } from "@/lib/schemas/staff";

/* --- CSV template ------------------------------------------------------------- */
const CSV_HEADERS = ["name","nid","phone","email","dateOfBirth","role","centerId","shift"];
const CSV_EXAMPLE = ["Dr. Rahim Uddin","1234567890123","01711000000","rahim@vax.gov.bd","1985-06-15","VACCINATOR","<centerId>","morning"];

function downloadTemplate() {
  const csv  = [CSV_HEADERS.join(","), CSV_EXAMPLE.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "staff_import_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* --- Validated row ------------------------------------------------------------ */
interface ValidatedRow {
  raw:    Record<string, string>;
  parsed: BulkImportRow | null;
  errors: { field: string; message: string }[];
}

function validateRows(rawRows: Record<string, string>[]): ValidatedRow[] {
  return rawRows.map((raw) => {
    const parsed = BulkImportRowSchema.safeParse(raw);
    if (parsed.success) return { raw, parsed: parsed.data, errors: [] };
    return {
      raw,
      parsed: null,
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    };
  });
}

/* --- BulkImportDialog --------------------------------------------------------- */
interface Props { open: boolean; onClose: () => void; onImported: () => void }

export function BulkImportDialog({ open, onClose, onImported }: Props) {
  const [rows,      setRows]      = useState<ValidatedRow[]>([]);
  const [dragging,  setDragging]  = useState(false);
  const [fileName,  setFileName]  = useState("");
  const [result,    setResult]    = useState<{ created: number; failed: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const Papa = (await import("papaparse")).default;
    Papa.parse<Record<string, string>>(file, {
      header:       true,
      skipEmptyLines: true,
      complete: (res) => setRows(validateRows(res.data)),
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) parseFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.parsed !== null).map((r) => r.parsed!);
    startTransition(async () => {
      const res = await bulkImport(validRows);
      if (res.ok) {
        setResult({ created: res.data.created, failed: res.data.failed });
        onImported();
      }
    });
  }

  const validCount   = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;

  function reset() {
    setRows([]); setFileName(""); setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[var(--accent)]" /> Bulk Import Staff
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span className="text-sm text-[var(--foreground)]">Download CSV template</span>
            </div>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 && !result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all",
                dragging
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--background-subtle)]"
              )}
            >
              <Upload className={cn("h-8 w-8 transition-colors", dragging ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]")} />
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Drop CSV file here or click to browse</p>
                <p className="text-xs text-[var(--foreground-muted)]">Supports .csv files only</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            </div>
          )}

          {/* Summary bar */}
          {rows.length > 0 && !result && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--foreground-muted)]">
                  <strong className="text-[var(--foreground)]">{rows.length}</strong> rows from <em>{fileName}</em>
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--danger)]">
                    <XCircle className="h-3.5 w-3.5" /> {invalidCount} errors
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={reset} className="text-xs text-[var(--foreground-muted)]">
                Clear
              </Button>
            </div>
          )}

          {/* Validation table */}
          {rows.length > 0 && !result && (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--background-subtle)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">NID</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Role</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rows.map((row, i) => {
                      const hasError = row.errors.length > 0;
                      return (
                        <tr key={i} className={cn(hasError ? "bg-[var(--danger-subtle)]" : "")}>
                          <td className="px-3 py-2 text-[var(--foreground-muted)]">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-[var(--foreground)]">{row.raw.name ?? "-"}</td>
                          <td className="px-3 py-2 font-mono text-[var(--foreground-muted)]">{row.raw.nid ?? "-"}</td>
                          <td className="px-3 py-2 text-[var(--foreground-muted)]">{row.raw.email ?? "-"}</td>
                          <td className="px-3 py-2">{row.raw.role ?? "-"}</td>
                          <td className="px-3 py-2">
                            {hasError ? (
                              <div className="flex items-center gap-1 text-[var(--danger)]">
                                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{row.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}</span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 text-[var(--accent)]">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-4">
                <CheckCircle2 className="h-6 w-6 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--accent)]">Import Complete</p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {result.created} accounts created - {result.failed} failed
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            {result ? "Close" : "Cancel"}
          </Button>
          {rows.length > 0 && !result && (
            <Button
              onClick={handleImport}
              disabled={isPending || validCount === 0}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {validCount} Staff
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
