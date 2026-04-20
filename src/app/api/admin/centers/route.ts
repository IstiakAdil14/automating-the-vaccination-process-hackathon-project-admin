import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Center } from "@/models/Center";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search   = searchParams.get("search")   ?? "";
  const status   = searchParams.get("status")   ?? "";
  const division = searchParams.get("division") ?? "";
  const type     = searchParams.get("type")     ?? "";
  const sortBy   = searchParams.get("sortBy")   ?? "createdAt";
  const sortDir  = searchParams.get("sortDir")  === "asc" ? 1 : -1;

  await connectDB();

  /* Build filter */
  const filter: Record<string, unknown> = {};
  if (status)   filter.status             = status;
  if (division) filter["address.division"] = division;
  if (type)     filter.type               = type;
  if (search) {
    filter.$or = [
      { name:      { $regex: search, $options: "i" } },
      { licenseNo: { $regex: search, $options: "i" } },
      { "address.district": { $regex: search, $options: "i" } },
    ];
  }

  const allowedSort = ["name", "createdAt", "totalVaccinations", "dailyCapacity", "status"];
  const safeSort = allowedSort.includes(sortBy) ? sortBy : "createdAt";

  const [centers, total] = await Promise.all([
    Center.find(filter)
      .sort({ [safeSort]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Center.countDocuments(filter),
  ]);

  return NextResponse.json({
    data:       centers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
