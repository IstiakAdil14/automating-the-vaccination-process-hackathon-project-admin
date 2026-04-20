"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Inventory } from "@/models/Inventory";
import { Vaccine } from "@/models/Vaccine";
import { Center } from "@/models/Center";
import { getAdminSession } from "@/lib/getAdminSession";
import type { ActionResult } from "./centers";

/* --- Shared types ------------------------------------------------------------- */
export interface NationalStockEntry {
  vaccineId:       string;
  vaccineName:     string;
  shortName:       string;
  totalDoses:      number;
  dosesAdministered: number;
  lowStockCenters: number;
  outOfStockCenters: number;
  projectedDaysLeft: number;
  trend: { date: string; qty: number }[];
}

export interface CenterStockRow {
  centerId:   string;
  centerName: string;
  division:   string;
  district:   string;
  vaccines:   { vaccineId: string; shortName: string; qty: number; threshold: number; expiryDate: string }[];
  overallStatus: "SUFFICIENT" | "LOW" | "CRITICAL";
}

export interface RestockRequest {
  _id:          string;
  centerId:     string;
  centerName:   string;
  division:     string;
  vaccineId:    string;
  vaccineName:  string;
  shortName:    string;
  qtyRequested: number;
  submittedAt:  string;
  urgency:      "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status:       "PENDING" | "APPROVED" | "DENIED";
  denyReason?:  string;
}

export interface DispatchEntry {
  _id:            string;
  vaccineId:      string;
  vaccineName:    string;
  shortName:      string;
  quantity:       number;
  batchNo:        string;
  lotNo:          string;
  dispatchDate:   string;
  expectedDelivery: string;
  centerId:       string;
  centerName:     string;
  division:       string;
  confirmed:      boolean;
  confirmedAt?:   string;
}

export interface ExpiryRow {
  inventoryId:  string;
  centerId:     string;
  centerName:   string;
  division:     string;
  vaccineId:    string;
  vaccineName:  string;
  shortName:    string;
  quantity:     number;
  expiryDate:   string;
  daysLeft:     number;
  wastageRate:  number;
}

/* --- getNationalStock --------------------------------------------------------- */
export async function getNationalStock(): Promise<ActionResult<NationalStockEntry[]>> {
  await connectDB();

  const vaccines = await Vaccine.find({ isActive: true }).lean();
  const now      = new Date();

  const entries: NationalStockEntry[] = await Promise.all(
    vaccines.map(async (v) => {
      const records = await Inventory.find({ vaccineId: v._id, expiryDate: { $gt: now } }).lean();

      const totalDoses        = records.reduce((s, r) => s + r.quantityOnHand, 0);
      const dosesAdministered = records.reduce((s, r) => s + r.dosesAdministered, 0);
      const lowStockCenters   = records.filter((r) => r.quantityOnHand <= r.lowStockThreshold && r.quantityOnHand > 0).length;
      const outOfStockCenters = records.filter((r) => r.quantityOnHand === 0).length;

      // Projected days: assume daily pace = dosesAdministered / 60 days
      const dailyPace       = dosesAdministered > 0 ? dosesAdministered / 60 : 1;
      const projectedDaysLeft = Math.floor(totalDoses / dailyPace);

      // Build 60-day trend (mock distribution based on real totals)
      const trend = Array.from({ length: 60 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (59 - i));
        return {
          date: d.toISOString().slice(0, 10),
          qty:  Math.max(0, totalDoses + Math.round((i - 59) * dailyPace)),
        };
      });

      return {
        vaccineId:         String(v._id),
        vaccineName:       v.name,
        shortName:         v.shortName,
        totalDoses,
        dosesAdministered,
        lowStockCenters,
        outOfStockCenters,
        projectedDaysLeft,
        trend,
      };
    })
  );

  return { ok: true, data: entries };
}

/* --- getPerCenterStock -------------------------------------------------------- */
export async function getPerCenterStock(filters?: {
  division?: string; district?: string; vaccineId?: string; stockLevel?: string;
}): Promise<ActionResult<CenterStockRow[]>> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const centerFilter: Record<string, any> = { status: "ACTIVE" };
  if (filters?.division) centerFilter["address.division"] = filters.division;
  if (filters?.district) centerFilter["address.district"] = filters.district;

  const centers  = await Center.find(centerFilter).lean();
  const vaccines = await Vaccine.find({ isActive: true }).lean();
  const now      = new Date();

  const rows = await Promise.all(
    centers.map(async (c) => {
      const invRecords = await Inventory.find({ centerId: c._id, expiryDate: { $gt: now } }).lean();

      const vaccineMap = vaccines.map((v) => {
        const rec = invRecords.find((r) => String(r.vaccineId) === String(v._id));
        return {
          vaccineId:  String(v._id),
          shortName:  v.shortName,
          qty:        rec?.quantityOnHand ?? 0,
          threshold:  rec?.lowStockThreshold ?? 50,
          expiryDate: rec?.expiryDate.toISOString() ?? "",
        };
      });

      const filtered = filters?.vaccineId
        ? vaccineMap.filter((vm) => vm.vaccineId === filters.vaccineId)
        : vaccineMap;

      const anyOut  = filtered.some((vm) => vm.qty === 0);
      const anyLow  = filtered.some((vm) => vm.qty > 0 && vm.qty <= vm.threshold);
      const overallStatus: CenterStockRow["overallStatus"] = anyOut ? "CRITICAL" : anyLow ? "LOW" : "SUFFICIENT";

      if (filters?.stockLevel === "critical"  && overallStatus !== "CRITICAL")  return null;
      if (filters?.stockLevel === "low"       && overallStatus !== "LOW")       return null;
      if (filters?.stockLevel === "sufficient"&& overallStatus !== "SUFFICIENT") return null;

      return {
        centerId:      String(c._id),
        centerName:    c.name,
        division:      c.address.division,
        district:      c.address.district,
        vaccines:      filtered,
        overallStatus,
      };
    })
  );

  return { ok: true, data: rows.filter(Boolean) as CenterStockRow[] };
}

/* --- approveRestock ----------------------------------------------------------- */
export async function approveRestock(
  requestId: string,
  data: { confirmedQty: number; dispatchDate: string; batchNo: string; lotNo: string }
): Promise<ActionResult<void>> {
  const session = await getAdminSession();

  // In production: update RestockRequest model. Here we log and revalidate.
  console.info("[AUDIT] approveRestock", { adminId: session.user.id, requestId, ...data, ts: new Date().toISOString() });

  revalidatePath("/supply");
  return { ok: true, data: undefined };
}

/* --- denyRestock -------------------------------------------------------------- */
export async function denyRestock(requestId: string, reason: string): Promise<ActionResult<void>> {
  const session = await getAdminSession();
  console.info("[AUDIT] denyRestock", { adminId: session.user.id, requestId, reason, ts: new Date().toISOString() });
  revalidatePath("/supply");
  return { ok: true, data: undefined };
}

/* --- logDispatch -------------------------------------------------------------- */
export async function logDispatch(entry: Omit<DispatchEntry, "_id" | "confirmed" | "confirmedAt">): Promise<ActionResult<void>> {
  const session = await getAdminSession();
  console.info("[AUDIT] logDispatch", { adminId: session.user.id, ...entry, ts: new Date().toISOString() });
  revalidatePath("/supply");
  return { ok: true, data: undefined };
}

/* --- getExpiryData ------------------------------------------------------------ */
export async function getExpiryData(daysAhead = 90): Promise<ActionResult<ExpiryRow[]>> {
  await connectDB();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const now = new Date();

  const records = await Inventory.find({
    expiryDate: { $gt: now, $lte: cutoff },
    quantityOnHand: { $gt: 0 },
  })
    .populate("centerId",  "name address")
    .populate("vaccineId", "name shortName")
    .sort({ expiryDate: 1 })
    .lean();

  const rows: ExpiryRow[] = records.map((r) => {
    const center  = r.centerId  as unknown as { _id: unknown; name: string; address: { division: string } };
    const vaccine = r.vaccineId as unknown as { _id: unknown; name: string; shortName: string };
    const daysLeft = Math.ceil((r.expiryDate.getTime() - now.getTime()) / 86_400_000);
    const wastageRate = r.dosesAdministered > 0
      ? Math.round(((r.dosesAdministered - r.quantityOnHand) / r.dosesAdministered) * 100)
      : 0;

    return {
      inventoryId:  r.inventoryId,
      centerId:     String(center._id),
      centerName:   center.name,
      division:     center.address.division,
      vaccineId:    String(vaccine._id),
      vaccineName:  vaccine.name,
      shortName:    vaccine.shortName,
      quantity:     r.quantityOnHand,
      expiryDate:   r.expiryDate.toISOString(),
      daysLeft,
      wastageRate,
    };
  });

  return { ok: true, data: rows };
}

/* --- reportWastage ------------------------------------------------------------ */
export async function reportWastage(inventoryId: string, qty: number, reason: string): Promise<ActionResult<void>> {
  const session = await getAdminSession();
  await connectDB();

  const inv = await Inventory.findOne({ inventoryId });
  if (!inv) return { ok: false, error: "Inventory record not found" };

  inv.quantityOnHand = Math.max(0, inv.quantityOnHand - qty);
  await inv.save();

  console.info("[AUDIT] reportWastage", { adminId: session.user.id, inventoryId, qty, reason, ts: new Date().toISOString() });
  revalidatePath("/supply");
  return { ok: true, data: undefined };
}

/* --- getForecast -------------------------------------------------------------- */
export async function getForecast(): Promise<ActionResult<{
  summary: string;
  projections: { vaccineName: string; days30: number; days60: number; days90: number; currentStock: number }[];
}>> {
  await connectDB();

  const stockResult = await getNationalStock();
  if (!stockResult.ok) return { ok: false, error: stockResult.error };

  const stockSummary = stockResult.data.map((s) =>
    `${s.vaccineName}: ${s.totalDoses} doses, ${s.dosesAdministered} administered in 60 days, projected ${s.projectedDaysLeft} days remaining`
  ).join("\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Return computed projections without AI narrative
    return {
      ok: true,
      data: {
        summary: "AI narrative unavailable (OPENAI_API_KEY not configured). Projections are computed from current pace.",
        projections: stockResult.data.map((s) => {
          const dailyPace = s.dosesAdministered > 0 ? s.dosesAdministered / 60 : 1;
          return {
            vaccineName:  s.vaccineName,
            currentStock: s.totalDoses,
            days30: Math.max(0, Math.round(s.totalDoses - dailyPace * 30)),
            days60: Math.max(0, Math.round(s.totalDoses - dailyPace * 60)),
            days90: Math.max(0, Math.round(s.totalDoses - dailyPace * 90)),
          };
        }),
      },
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: "You are a public health supply chain analyst. Respond with a concise 3-4 sentence narrative about vaccine stock projections and any critical shortages. Be specific about vaccine names and timelines.",
        },
        {
          role: "user",
          content: `Current national vaccine stock data:\n${stockSummary}\n\nProvide a 30/60/90 day supply outlook and flag any critical shortages.`,
        },
      ],
    }),
  });

  const json = await res.json();
  const summary = json.choices?.[0]?.message?.content ?? "Unable to generate forecast.";

  return {
    ok: true,
    data: {
      summary,
      projections: stockResult.data.map((s) => {
        const dailyPace = s.dosesAdministered > 0 ? s.dosesAdministered / 60 : 1;
        return {
          vaccineName:  s.vaccineName,
          currentStock: s.totalDoses,
          days30: Math.max(0, Math.round(s.totalDoses - dailyPace * 30)),
          days60: Math.max(0, Math.round(s.totalDoses - dailyPace * 60)),
          days90: Math.max(0, Math.round(s.totalDoses - dailyPace * 90)),
        };
      }),
    },
  };
}
