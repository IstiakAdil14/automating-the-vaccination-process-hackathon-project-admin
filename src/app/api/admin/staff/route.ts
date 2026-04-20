import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search   = searchParams.get("search")   ?? "";
  const status   = searchParams.get("status")   ?? "";
  const role     = searchParams.get("role")     ?? "";
  const centerId = searchParams.get("centerId") ?? "";
  const sortBy   = searchParams.get("sortBy")   ?? "createdAt";
  const sortDir  = searchParams.get("sortDir")  === "asc" ? 1 : -1;

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (role)     filter.role     = role;
  if (centerId) filter.centerId = centerId;

  if (status === "active")    { filter.isActive = true;  filter.isSuspended = false; }
  if (status === "suspended") { filter.isSuspended = true; }
  if (status === "inactive")  { filter.isActive = false; filter.isSuspended = false; }

  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { nid:   { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const allowedSort = ["name", "createdAt", "totalVaccinations", "shiftsWorked", "role"];
  const safeSort    = allowedSort.includes(sortBy) ? sortBy : "createdAt";

  const [staff, total] = await Promise.all([
    Staff.find(filter)
      .populate("centerId", "name address.division address.district")
      .sort({ [safeSort]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Staff.countDocuments(filter),
  ]);

  return NextResponse.json({
    data:       staff,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
