"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { DivisionBreakdownRow } from "@/app/actions/heatmap";

/* --- PDF styles --------------------------------------------------------------- */
const pdfStyles = StyleSheet.create({
  page:    { padding: 40, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  header:  { marginBottom: 24 },
  title:   { fontSize: 20, fontWeight: "bold", color: "#0F172A", marginBottom: 4 },
  subtitle:{ fontSize: 10, color: "#64748B" },
  mapImg:  { width: "100%", height: 300, borderRadius: 8, marginBottom: 24, objectFit: "cover" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#0F172A", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #E2E8F0" },
  table:   { width: "100%" },
  tableRow:{ flexDirection: "row", borderBottom: "1px solid #F1F5F9", paddingVertical: 5 },
  tableHeader: { flexDirection: "row", borderBottom: "2px solid #E2E8F0", paddingVertical: 6, marginBottom: 2 },
  col1:    { flex: 2, fontSize: 9, color: "#0F172A" },
  col2:    { flex: 1, fontSize: 9, color: "#0F172A", textAlign: "right" },
  colH:    { flex: 2, fontSize: 9, fontWeight: "bold", color: "#64748B", textTransform: "uppercase" },
  colH2:   { flex: 1, fontSize: 9, fontWeight: "bold", color: "#64748B", textAlign: "right", textTransform: "uppercase" },
  footer:  { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#94A3B8", textAlign: "center" },
});

/* --- PDF Document ------------------------------------------------------------- */
function HeatmapReport({
  mapImageUrl,
  divisions,
  generatedAt,
}: {
  mapImageUrl: string;
  divisions:   DivisionBreakdownRow[];
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Vaccination Coverage Report</Text>
          <Text style={pdfStyles.subtitle}>
            Government of Bangladesh - Ministry of Health & Family Welfare - {generatedAt}
          </Text>
        </View>

        {/* Map snapshot */}
        <Image src={mapImageUrl} style={pdfStyles.mapImg} />

        {/* Division table */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Coverage by Division</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={pdfStyles.colH}>Division</Text>
              <Text style={pdfStyles.colH2}>Doses</Text>
              <Text style={pdfStyles.colH2}>Population</Text>
              <Text style={pdfStyles.colH2}>Coverage</Text>
              <Text style={pdfStyles.colH2}>Centers</Text>
            </View>
            {divisions.map((row) => (
              <View key={row.division} style={pdfStyles.tableRow}>
                <Text style={pdfStyles.col1}>{row.division}</Text>
                <Text style={pdfStyles.col2}>{new Intl.NumberFormat("en-US").format(row.totalVaccinations)}</Text>
                <Text style={pdfStyles.col2}>{new Intl.NumberFormat("en-US").format(row.totalCitizens)}</Text>
                <Text style={[pdfStyles.col2, { color: row.coveragePercent >= 70 ? "#10B981" : row.coveragePercent >= 40 ? "#F59E0B" : "#EF4444" }]}>
                  {row.coveragePercent}%
                </Text>
                <Text style={pdfStyles.col2}>{row.activeCenters}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={pdfStyles.footer}>
          Confidential - For authorized government use only - VaxAdmin Portal
        </Text>
      </Page>
    </Document>
  );
}

/* --- Export button ------------------------------------------------------------ */
interface ExportButtonProps {
  mapContainerId: string;
  divisions:      DivisionBreakdownRow[];
}

export function ExportButton({ mapContainerId, divisions }: ExportButtonProps) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState<"png" | "pdf" | null>(null);

  async function captureMap(): Promise<string> {
    const html2canvas = (await import("html2canvas")).default;
    const el = document.getElementById(mapContainerId);
    if (!el) throw new Error("Map container not found");
    const canvas = await html2canvas(el, { useCORS: true, scale: 1.5, logging: false });
    return canvas.toDataURL("image/png");
  }

  async function exportPng() {
    setLoading("png");
    try {
      const dataUrl = await captureMap();
      const a = document.createElement("a");
      a.href     = dataUrl;
      a.download = `vax-heatmap-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function exportPdf() {
    setLoading("pdf");
    try {
      const mapImageUrl  = await captureMap();
      const generatedAt  = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const blob = await pdf(
        <HeatmapReport mapImageUrl={mapImageUrl} divisions={divisions} generatedAt={generatedAt} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `vax-coverage-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="pointer-events-auto relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium shadow-lg transition-all hover:border-[var(--health-green-500)] hover:text-[var(--health-green-500)]"
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
          >
            <button
              onClick={exportPng}
              disabled={!!loading}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background-subtle)] disabled:opacity-50"
            >
              {loading === "png"
                ? <Loader2 className="h-4 w-4 animate-spin text-[var(--health-green-500)]" />
                : <FileImage className="h-4 w-4 text-[var(--blue-500)]" />
              }
              Save as PNG
            </button>
            <div className="mx-4 h-px bg-[var(--border)]" />
            <button
              onClick={exportPdf}
              disabled={!!loading}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background-subtle)] disabled:opacity-50"
            >
              {loading === "pdf"
                ? <Loader2 className="h-4 w-4 animate-spin text-[var(--health-green-500)]" />
                : <FileText className="h-4 w-4 text-[var(--red-500)]" />
              }
              Export PDF Report
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
