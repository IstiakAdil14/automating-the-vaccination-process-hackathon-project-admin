import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Center } from "@/models/Center";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";

// Loose model for center_applications collection
const AppSchema = new mongoose.Schema({}, { strict: false, collection: "center_applications", timestamps: true });
const CenterApp = mongoose.models.CenterApp ?? mongoose.model("CenterApp", AppSchema);

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const CENTER_TYPE_MAP: Record<string, string> = {
  "Government Hospital": "GOVT_HOSPITAL",
  "Private Clinic":      "PRIVATE_CLINIC",
  "Community Center":    "COMMUNITY",
  "Mobile Unit":         "MOBILE",
};

// Map center_application doc → Center-shaped object the table expects
function mapApp(doc: Record<string, unknown>) {
  const schedule = (doc.schedule ?? {}) as Record<string, Record<string, unknown>>;
  const operatingHours = Object.entries(schedule)
    .filter(([, s]) => s.open)
    .map(([day, s]) => ({
      day:          DAY_MAP[day.toLowerCase()] ?? 0,
      morningStart: s.morningStart as string | undefined,
      morningEnd:   s.morningEnd   as string | undefined,
      eveningStart: s.eveningStart as string | undefined,
      eveningEnd:   s.eveningEnd   as string | undefined,
    }));

  return {
    _id:               String(doc._id),
    centerId:          doc.referenceNumber,
    name:              doc.centerName,
    licenseNo:         doc.licenseNumber,
    type:              (CENTER_TYPE_MAP[doc.centerType as string] ?? "GOVT_HOSPITAL") as "GOVT_HOSPITAL" | "PRIVATE_CLINIC" | "COMMUNITY" | "MOBILE",
    status:            "PENDING" as const,
    geoLat:            doc.geoLat ?? 0,
    geoLng:            doc.geoLng ?? 0,
    address: {
      division: doc.division,
      district: doc.district,
      upazila:  doc.upazila ?? doc.localBodyName ?? "",
      full:     doc.address,
    },
    contact: {
      name:  doc.contactName,
      phone: doc.phone,
      email: doc.email,
    },
    dailyCapacity:      doc.capacity ?? 100,
    totalVaccinations:  0,
    operatingHours,
    facilityLicenseUrl: doc.facilityLicenseUrl,
    centerPhotoUrl:     doc.centerPhotoUrl,
    officerNidUrl:      doc.officerNidUrl,
    referenceNumber:    doc.referenceNumber,
    localBodyType:      doc.localBodyType,
    createdAt:          doc.createdAt,
    updatedAt:          doc.updatedAt,
  };
}

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

  const allowedSort = ["name", "createdAt", "totalVaccinations", "dailyCapacity", "status"];
  const safeSort = allowedSort.includes(sortBy) ? sortBy : "createdAt";

  // If filtering for PENDING — read from center_applications
  if (status === "PENDING") {
    const appFilter: Record<string, unknown> = { status: "pending_review" };
    if (division) appFilter.division = division;
    if (search) {
      appFilter.$or = [
        { centerName:  { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
        { district:    { $regex: search, $options: "i" } },
      ];
    }
    const sortField = sortBy === "name" ? "centerName" : sortBy === "totalVaccinations" ? "createdAt" : sortBy;
    const [apps, total] = await Promise.all([
      CenterApp.find(appFilter).sort({ [sortField]: sortDir }).skip((page - 1) * limit).limit(limit).lean(),
      CenterApp.countDocuments(appFilter),
    ]);
    return NextResponse.json({
      data:       (apps as Record<string, unknown>[]).map(mapApp),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  // All other filters — read from centers collection
  const filter: Record<string, unknown> = {};
  if (status)   filter.status              = status;
  if (division) filter["address.division"] = division;
  if (type)     filter.type                = type;
  if (search) {
    filter.$or = [
      { name:      { $regex: search, $options: "i" } },
      { licenseNo: { $regex: search, $options: "i" } },
      { "address.district": { $regex: search, $options: "i" } },
    ];
  }

  const [centers, total] = await Promise.all([
    Center.find(filter).sort({ [safeSort]: sortDir }).skip((page - 1) * limit).limit(limit).lean(),
    Center.countDocuments(filter),
  ]);

  return NextResponse.json({
    data:       centers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
