import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StaffRequest } from "@/models/StaffRequest";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "";
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const requests = await StaffRequest.find(filter)
    .populate("centerId", "name address.division")
    .populate("staffId",  "name role")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ data: requests });
}
