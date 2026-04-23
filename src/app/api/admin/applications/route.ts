import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CenterApplication } from "@/models/CenterApplication";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "pending_review";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;

  const [data, total] = await Promise.all([
    CenterApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CenterApplication.countDocuments(filter),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
