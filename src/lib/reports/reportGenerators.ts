/**
 * reportGenerators.ts
 * Generates report buffers in PDF, CSV, XLSX, and JSON formats.
 * Uses @react-pdf/renderer for PDF and exceljs for XLSX.
 */

import { connectDB } from "@/lib/db";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import { User } from "@/models/User";
import { Center } from "@/models/Center";
import { Staff } from "@/models/Staff";
import { Inventory } from "@/models/Inventory";
import { FraudAlert } from "@/models/FraudAlert";
import {
  getNationalKPIs,
  getDivisionBreakdown,
  getDailyVaccinationTrend,
  getVaccineTypeDistribution,
} from "@/services/adminStatsService";

/* --- Types -------------------------------------------------------------------- */
export interface ReportConfig {
  type:       string;
  title:      string;
  format:     "PDF" | "CSV" | "XLSX" | "JSON";
  dateFrom?:  string;
  dateTo?:    string;
  divisions?: string[];
  metrics?:   string[];
  adminName?: string;
}

export interface ReportData {
  title:       string;
  generatedAt: string;
  generatedBy: string;
  dateRange:   string;
  sections:    ReportSection[];
}

export interface ReportSection {
  heading: string;
  rows:    Record<string, string | number>[];
  columns: string[];
}

/* --- Data fetcher ------------------------------------------------------------- */
async function fetchReportData(config: ReportConfig): Promise<ReportData> {
  await connectDB();

  const now      = new Date();
  const dateFrom = config.dateFrom ? new Date(config.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo   = config.dateTo   ? new Date(config.dateTo)   : now;

  const sections: ReportSection[] = [];
  const metrics = config.metrics ?? ["vaccinations", "coverage", "supply", "fraud"];

  if (metrics.includes("vaccinations") || metrics.includes("doses_count")) {
    const kpis = await getNationalKPIs();
    sections.push({
      heading: "National Vaccination KPIs",
      columns: ["Metric", "Value"],
      rows: [
        { Metric: "Total Citizens",          Value: kpis.totalCitizens },
        { Metric: "Fully Vaccinated",        Value: kpis.totalVaccinated },
        { Metric: "Partially Vaccinated",    Value: kpis.totalPartial },
        { Metric: "Coverage %",              Value: `${kpis.coveragePercent}%` },
        { Metric: "Vaccinations This Month", Value: kpis.vaccinationsThisMonth },
        { Metric: "Vaccinations This Week",  Value: kpis.vaccinationsThisWeek },
        { Metric: "Vaccinations Today",      Value: kpis.vaccinationsToday },
      ],
    });
  }

  if (metrics.includes("coverage") || metrics.includes("coverage_by_region")) {
    const divData = await getDivisionBreakdown();
    const filtered = config.divisions?.length
      ? divData.filter((d) => config.divisions!.includes(d.division))
      : divData;
    sections.push({
      heading: "Coverage by Division",
      columns: ["Division", "Total Citizens", "Vaccinated", "Partial", "Coverage %", "Active Centers"],
      rows: filtered.map((d) => ({
        Division:        d.division,
        "Total Citizens": d.totalCitizens,
        Vaccinated:      d.vaccinated,
        Partial:         d.partial,
        "Coverage %":    `${d.coveragePercent}%`,
        "Active Centers": d.activeCenters,
      })),
    });
  }

  if (metrics.includes("supply") || metrics.includes("stock_levels")) {
    const lowStock = await Inventory.find({
      $expr: { $lte: ["$quantityOnHand", "$lowStockThreshold"] },
      expiryDate: { $gt: now },
    })
      .populate("centerId",  "name address.division")
      .populate("vaccineId", "name shortName")
      .limit(100)
      .lean();

    sections.push({
      heading: "Low Stock Alerts",
      columns: ["Center", "Division", "Vaccine", "Qty On Hand", "Threshold"],
      rows: lowStock.map((r) => {
        const c = r.centerId  as unknown as { name: string; address: { division: string } };
        const v = r.vaccineId as unknown as { name: string; shortName: string };
        return {
          Center:       c?.name ?? "-",
          Division:     c?.address?.division ?? "-",
          Vaccine:      v?.shortName ?? "-",
          "Qty On Hand": r.quantityOnHand,
          Threshold:    r.lowStockThreshold,
        };
      }),
    });
  }

  if (metrics.includes("fraud") || metrics.includes("fraud_flags")) {
    const fraudAlerts = await FraudAlert.find({
      createdAt: { $gte: dateFrom, $lte: dateTo },
    })
      .populate("centerId", "name address.division")
      .limit(200)
      .lean();

    sections.push({
      heading: "Fraud Alerts",
      columns: ["Type", "Severity", "Status", "Center", "Division", "Date"],
      rows: fraudAlerts.map((f) => {
        const c = f.centerId as unknown as { name: string; address: { division: string } };
        return {
          Type:     f.type,
          Severity: f.severity,
          Status:   f.status,
          Center:   c?.name ?? "-",
          Division: c?.address?.division ?? "-",
          Date:     f.createdAt.toISOString().slice(0, 10),
        };
      }),
    });
  }

  if (metrics.includes("staff_performance")) {
    const topStaff = await Staff.find({ isActive: true })
      .sort({ totalVaccinations: -1 })
      .limit(50)
      .lean();

    sections.push({
      heading: "Staff Performance",
      columns: ["Name", "Role", "Total Vaccinations", "Shifts Worked"],
      rows: topStaff.map((s) => ({
        Name:                s.name,
        Role:                s.role,
        "Total Vaccinations": s.totalVaccinations,
        "Shifts Worked":     s.shiftsWorked,
      })),
    });
  }

  if (metrics.includes("wastage")) {
    const expiring = await Inventory.find({
      expiryDate: { $gt: now, $lte: new Date(now.getTime() + 30 * 86_400_000) },
      quantityOnHand: { $gt: 0 },
    })
      .populate("centerId",  "name address.division")
      .populate("vaccineId", "name shortName")
      .sort({ expiryDate: 1 })
      .lean();

    sections.push({
      heading: "Expiring Vaccines (30 days)",
      columns: ["Center", "Division", "Vaccine", "Quantity", "Expiry Date"],
      rows: expiring.map((r) => {
        const c = r.centerId  as unknown as { name: string; address: { division: string } };
        const v = r.vaccineId as unknown as { name: string; shortName: string };
        return {
          Center:       c?.name ?? "-",
          Division:     c?.address?.division ?? "-",
          Vaccine:      v?.shortName ?? "-",
          Quantity:     r.quantityOnHand,
          "Expiry Date": r.expiryDate.toISOString().slice(0, 10),
        };
      }),
    });
  }

  return {
    title:       config.title,
    generatedAt: now.toISOString(),
    generatedBy: config.adminName ?? "Admin",
    dateRange:   `${dateFrom.toISOString().slice(0, 10)} to ${dateTo.toISOString().slice(0, 10)}`,
    sections,
  };
}

/* --- CSV generator ------------------------------------------------------------ */
function generateCSV(data: ReportData): Buffer {
  const lines: string[] = [
    `# ${data.title}`,
    `# Generated: ${data.generatedAt}`,
    `# By: ${data.generatedBy}`,
    `# Period: ${data.dateRange}`,
    "",
  ];

  for (const section of data.sections) {
    lines.push(`## ${section.heading}`);
    lines.push(section.columns.map((c) => `"${c}"`).join(","));
    for (const row of section.rows) {
      lines.push(section.columns.map((c) => `"${String(row[c] ?? "")}"`).join(","));
    }
    lines.push("");
  }

  return Buffer.from(lines.join("\n"), "utf-8");
}

/* --- JSON generator ----------------------------------------------------------- */
function generateJSON(data: ReportData): Buffer {
  return Buffer.from(JSON.stringify(data, null, 2), "utf-8");
}

/* --- XLSX generator ----------------------------------------------------------- */
async function generateXLSX(data: ReportData): Promise<Buffer> {
  try {
    // Dynamic import - exceljs is optional
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator  = data.generatedBy;
    wb.created  = new Date(data.generatedAt);

    for (const section of data.sections) {
      const ws = wb.addWorksheet(section.heading.slice(0, 31));

      // Title row
      ws.addRow([data.title]);
      ws.addRow([`Generated: ${data.generatedAt} | By: ${data.generatedBy}`]);
      ws.addRow([`Period: ${data.dateRange}`]);
      ws.addRow([]);

      // Header
      const headerRow = ws.addRow(section.columns);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };

      // Data rows
      for (const row of section.rows) {
        ws.addRow(section.columns.map((c) => row[c] ?? ""));
      }

      // Auto-width
      ws.columns.forEach((col) => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = String(cell.value ?? "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 50);
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch {
    // Fallback to CSV if exceljs not installed
    return generateCSV(data);
  }
}

/* --- PDF generator ------------------------------------------------------------ */
async function generatePDF(data: ReportData): Promise<Buffer> {
  try {
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
    const React = await import("react");

    const styles = StyleSheet.create({
      page:       { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
      header:     { marginBottom: 20, borderBottom: "2px solid #10B981", paddingBottom: 10 },
      title:      { fontSize: 18, fontWeight: "bold", color: "#111827" },
      subtitle:   { fontSize: 10, color: "#6B7280", marginTop: 4 },
      section:    { marginTop: 20 },
      sectionHead:{ fontSize: 13, fontWeight: "bold", color: "#10B981", marginBottom: 8 },
      tableHead:  { flexDirection: "row", backgroundColor: "#F0FDF4", padding: "4 6", borderBottom: "1px solid #D1FAE5" },
      tableRow:   { flexDirection: "row", padding: "3 6", borderBottom: "1px solid #F3F4F6" },
      cell:       { flex: 1, fontSize: 8 },
      footer:     { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9CA3AF" },
    });

    const doc = React.createElement(Document, {},
      React.createElement(Page, { size: "A4", style: styles.page },
        // Header
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: styles.title }, "Government of Bangladesh"),
          React.createElement(Text, { style: { fontSize: 12, color: "#374151", marginTop: 2 } }, "Ministry of Health and Family Welfare"),
          React.createElement(Text, { style: { fontSize: 14, fontWeight: "bold", marginTop: 8 } }, data.title),
          React.createElement(Text, { style: styles.subtitle }, `Generated: ${new Date(data.generatedAt).toLocaleString("en-BD")} | By: ${data.generatedBy}`),
          React.createElement(Text, { style: styles.subtitle }, `Period: ${data.dateRange}`),
        ),
        // Sections
        ...data.sections.map((section) =>
          React.createElement(View, { key: section.heading, style: styles.section },
            React.createElement(Text, { style: styles.sectionHead }, section.heading),
            // Table header
            React.createElement(View, { style: styles.tableHead },
              ...section.columns.map((col) =>
                React.createElement(Text, { key: col, style: styles.cell }, col)
              )
            ),
            // Table rows (limit to 50 per section for PDF)
            ...section.rows.slice(0, 50).map((row, i) =>
              React.createElement(View, { key: i, style: { ...styles.tableRow, backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB" } },
                ...section.columns.map((col) =>
                  React.createElement(Text, { key: col, style: styles.cell }, String(row[col] ?? ""))
                )
              )
            ),
            section.rows.length > 50
              ? React.createElement(Text, { style: { fontSize: 8, color: "#6B7280", marginTop: 4 } }, `... and ${section.rows.length - 50} more rows (see CSV/XLSX for full data)`)
              : null,
          )
        ),
        // Footer
        React.createElement(Text, { style: styles.footer },
          `VaxAdmin Reporting System | ${data.generatedAt.slice(0, 10)} | Confidential`
        ),
      )
    );

    return await renderToBuffer(doc);
  } catch {
    // Fallback to CSV if @react-pdf/renderer not installed
    return generateCSV(data);
  }
}

/* --- Public API --------------------------------------------------------------- */
export async function generateWeeklyProgressPDF(dateRange: { from: string; to: string }, adminName?: string): Promise<Buffer> {
  const data = await fetchReportData({
    type: "WEEKLY_PROGRESS", title: "Weekly National Progress Report",
    format: "PDF", dateFrom: dateRange.from, dateTo: dateRange.to,
    metrics: ["vaccinations", "coverage", "supply"],
    adminName,
  });
  return generatePDF(data);
}

export async function generateCoverageSummaryXLSX(filters: { divisions?: string[] }, adminName?: string): Promise<Buffer> {
  const data = await fetchReportData({
    type: "COVERAGE_SUMMARY", title: "Monthly Coverage Summary by Division",
    format: "XLSX", divisions: filters.divisions,
    metrics: ["coverage"],
    adminName,
  });
  return generateXLSX(data);
}

export async function generateCustomReport(config: ReportConfig): Promise<Buffer> {
  const data = await fetchReportData(config);
  switch (config.format) {
    case "PDF":  return generatePDF(data);
    case "XLSX": return generateXLSX(data);
    case "JSON": return generateJSON(data);
    default:     return generateCSV(data);
  }
}

export async function generatePublicDataset(): Promise<Buffer> {
  await connectDB();

  // Fully anonymized - no PII
  const divData = await getDivisionBreakdown();
  const vaccDist = await getVaccineTypeDistribution();
  const trend    = await getDailyVaccinationTrend(90);

  const lines: string[] = [
    "# Bangladesh Vaccination Public Dataset",
    "# Anonymized - No PII. Aggregated data only.",
    `# Generated: ${new Date().toISOString()}`,
    "",
    "## Coverage by Division",
    '"Division","Total Citizens","Vaccinated","Partial","Coverage %"',
    ...divData.map((d) => `"${d.division}","${d.totalCitizens}","${d.vaccinated}","${d.partial}","${d.coveragePercent}%"`),
    "",
    "## Vaccine Type Distribution",
    '"Vaccine","Short Name","Total Doses","Percent"',
    ...vaccDist.map((v) => `"${v.vaccineName}","${v.shortName}","${v.totalDoses}","${v.percent}%"`),
    "",
    "## Daily Vaccination Trend (90 days)",
    '"Date","Doses Administered"',
    ...trend.map((t) => `"${t.date}","${t.count}"`),
  ];

  return Buffer.from(lines.join("\n"), "utf-8");
}
