"use client";

import { useState } from "react";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportFormat = "CSV" | "PDF" | "XLSX";

interface DataExportButtonProps {
  /** Array of plain objects to export */
  data:      Record<string, unknown>[];
  filename:  string;
  formats?:  ExportFormat[];
  label?:    string;
}

/* --- CSV ---------------------------------------------------------------------- */
function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const escape  = (v: unknown) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.map(escape).join(","),
    ...data.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

/* --- XLSX (simple XML-based SpreadsheetML) ------------------------------------ */
function toXLSX(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const cell    = (v: unknown, type = "String") =>
    `<Cell><Data ss:Type="${type}">${String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`;

  const rows = [
    `<Row>${headers.map((h) => cell(h)).join("")}</Row>`,
    ...data.map(
      (row) =>
        `<Row>${headers
          .map((h) => {
            const v = row[h];
            const isNum = typeof v === "number";
            return cell(v, isNum ? "Number" : "String");
          })
          .join("")}</Row>`
    ),
  ].join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1"><Table>${rows}</Table></Worksheet>
</Workbook>`;
}

/* --- PDF (print-to-PDF via hidden iframe) ------------------------------------- */
function printAsPDF(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const ths = headers.map((h) => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5">${h}</th>`).join("");
  const trs = data
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td style="border:1px solid #ccc;padding:5px 10px">${row[h] ?? ""}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>${filename}</title>
    <style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}
    @media print{@page{margin:1cm}}</style></head>
    <body><h2 style="margin-bottom:12px">${filename}</h2>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

/* --- Download helper ---------------------------------------------------------- */
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --- Component ---------------------------------------------------------------- */
export function DataExportButton({
  data,
  filename,
  formats = ["CSV", "XLSX", "PDF"],
  label   = "Export",
}: DataExportButtonProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (!data.length) return;
    setLoading(format);

    /* Yield to paint the loading state before heavy work */
    await new Promise((r) => setTimeout(r, 0));

    try {
      if (format === "CSV") {
        downloadBlob(toCSV(data), `${filename}.csv`, "text/csv;charset=utf-8;");
      } else if (format === "XLSX") {
        downloadBlob(toXLSX(data), `${filename}.xls`, "application/vnd.ms-excel");
      } else if (format === "PDF") {
        printAsPDF(data, filename);
      }
    } finally {
      setLoading(null);
    }
  }

  if (formats.length === 1) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport(formats[0])}
        disabled={!!loading || !data.length}
        className="gap-1.5"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {label} {formats[0]}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading || !data.length}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((fmt) => (
          <DropdownMenuItem key={fmt} onClick={() => handleExport(fmt)}>
            Export as {fmt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
