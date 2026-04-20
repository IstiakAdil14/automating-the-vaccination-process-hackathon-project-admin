import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FraudAlert } from "@/models/FraudAlert";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "30"));
  const type     = searchParams.get("type")     ?? "";
  const severity = searchParams.get("severity") ?? "";
  const status   = searchParams.get("status")   ?? "";
  const centerId = searchParams.get("centerId") ?? "";

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (type)     filter.type     = type;
  if (severity) filter.severity = severity;
  if (status)   filter.status   = status;
  if (centerId) filter.centerId = centerId;

  const [docs, total] = await Promise.all([
    FraudAlert.find(filter)
      .populate("centerId", "name address.division")
      .populate("staffId",  "name")
      .populate("userId",   "name nid")
      .sort({ severity: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    FraudAlert.countDocuments(filter),
  ]);

  return NextResponse.json({
    data:       docs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
