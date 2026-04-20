"use client";

import { useState } from "react";
import { Download, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import type { DispatchEntry } from "@/app/actions/supply";

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

/* --- Mock dispatch log (replace with DB query when DispatchLog model exists) -- */
const MOCK_LOG: DispatchEntry[] = [
  { _id: "d1", vaccineId: "v1", vaccineName: "COVID-19 Vaccine", shortName: "COVID", quantity: 10000, batchNo: "BATCH-2024-001", lotNo: "LOT-A1", dispatchDate: new Date(Date.now() - 7*86400000).toISOString(), expectedDelivery: new Date(Date.now() - 5*86400000).toISOString(), centerId: "c1", centerName: "Dhaka Medical Center", division: "Dhaka", confirmed: true, confirmedAt: new Date(Date.now() - 5*86400000).toISOString() },
  { _id: "d2", vaccineId: "v2", vaccineName: "BCG Vaccine", shortName: "BCG", quantity: 3000, batchNo: "BATCH-2024-002", lotNo: "LOT-B2", dispatchDate: new Date(Date.now() - 3*86400000).toISOString(), expectedDelivery: new Date(Date.now() + 1*86400000).toISOString(), centerId: "c2", centerName: "Chittagong General", division: "Chittagong", confirmed: false },
  { _id: "d3", vaccineId: "v3", vaccineName: "MMR Vaccine", shortName: "MMR", quantity: 2000, batchNo: "BATCH-2024-003", lotNo: "LOT-C3", dispatchDate: new Date(Date.now() - 1*86400000).toISOString(), expectedDelivery: new Date(Date.now() + 2*86400000).toISOString(), centerId: "c3", centerName: "Sylhet MAG Osmani", division: "Sylhet", confirmed: false },
  { _id: "d4", vaccineId: "v1", vaccineName: "COVID-19 Vaccine", shortName: "COVID", quantity: 5000, batchNo: "BATCH-2024-004", lotNo: "LOT-A2", dispatchDate: new Date(Date.now() - 14*86400000).toISOString(), expectedDelivery: new Date(Date.now() - 12*86400000).toISOString(), centerId: "c4", centerName: "Rajshahi Medical", division: "Rajshahi", confirmed: true, confirmedAt: new Date(Date.now() - 12*86400000).toISOString() },
];

function exportCSV(data: DispatchEntry[]) {
  const headers = ["Vaccine","Quantity","Batch No","Lot No","Dispatch Date","Expected Delivery","Center","Division","Confirmed"];
  const rows = data.map((d) => [
    d.vaccineName, d.quantity, d.batchNo, d.lotNo,
    formatDate(d.dispatchDate), formatDate(d.expectedDelivery),
    d.centerName, d.division, d.confirmed ? "Yes" : "No",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `dispatch-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function DispatchLog() {
  const [division,   setDivision]   = useState("all");
  const [confirmed,  setConfirmed]  = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  const filtered = MOCK_LOG.filter((d) => {
    if (division  !== "all" && d.division !== division) return false;
    if (confirmed === "yes" && !d.confirmed)            return false;
    if (confirmed === "no"  && d.confirmed)             return false;
    if (dateFrom && d.dispatchDate < dateFrom)          return false;
    if (dateTo   && d.dispatchDate > dateTo + "T23:59") return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + export */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Division" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={confirmed} onValueChange={setConfirmed}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Confirmation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="yes">Confirmed</SelectItem>
            <SelectItem value="no">Pending</SelectItem>
          </SelectContent>
        </Select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
        <span className="text-xs text-[var(--foreground-muted)]">to</span>
        <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
        <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)} className="ml-auto gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Vaccine","Qty","Batch / Lot","Dispatch Date","Expected Delivery","Center","Division","Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-[var(--foreground-muted)]">No dispatch records found</td></tr>
              ) : filtered.map((d) => (
                <tr key={d._id} className="hover:bg-[var(--background-subtle)]">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[var(--foreground)]">{d.shortName}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{d.vaccineName}</p>
                  </td>
                  <td className="px-4 py-3.5 font-mono tabular-nums">{d.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs">{d.batchNo}</p>
                    <p className="font-mono text-xs text-[var(--foreground-muted)]">{d.lotNo}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">{formatDate(d.dispatchDate)}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">{formatDate(d.expectedDelivery)}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-[var(--foreground)]">{d.centerName}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{d.division}</td>
                  <td className="px-4 py-3.5">
                    {d.confirmed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--warning)]">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3">
          <span className="text-xs text-[var(--foreground-muted)]">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
