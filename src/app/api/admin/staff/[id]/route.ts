import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const staff = await Staff.findById(id)
    .populate("centerId", "name address.division address.district")
    .lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now        = new Date();
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [weekCount, monthCount, recentRecords] = await Promise.all([
    VaccinationRecord.countDocuments({ staffId: id, administeredAt: { $gte: weekStart } }),
    VaccinationRecord.countDocuments({ staffId: id, administeredAt: { $gte: monthStart } }),
    VaccinationRecord.find({ staffId: id })
      .sort({ administeredAt: -1 })
      .limit(20)
      .populate("userId",    "name nid")
      .populate("vaccineId", "name shortName")
      .lean(),
  ]);

  return NextResponse.json({
    staff,
    performance: {
      vaccinationsThisWeek:  weekCount,
      vaccinationsThisMonth: monthCount,
      vaccinationsTotal:     staff.totalVaccinations,
      shiftsWorked:          staff.shiftsWorked,
    },
    recentRecords,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();

  await connectDB();
  const staff = await Staff.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: staff });
}
