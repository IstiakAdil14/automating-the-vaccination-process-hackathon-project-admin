import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const OperatingHourSchema = z.object({
  day:          z.number().min(0).max(6),
  morningStart: z.string().regex(timeRegex).optional().or(z.literal("")),
  morningEnd:   z.string().regex(timeRegex).optional().or(z.literal("")),
  eveningStart: z.string().regex(timeRegex).optional().or(z.literal("")),
  eveningEnd:   z.string().regex(timeRegex).optional().or(z.literal("")),
});

export const CenterEditSchema = z.object({
  name:          z.string().min(3, "Name must be at least 3 characters").max(120),
  licenseNo:     z.string().min(3).max(50),
  type:          z.enum(["GOVT_HOSPITAL", "PRIVATE_CLINIC", "COMMUNITY", "MOBILE"]),
  geoLat:        z.number().min(20.7).max(26.6),
  geoLng:        z.number().min(88.0).max(92.7),
  dailyCapacity: z.number().int().min(1).max(10_000),
  address: z.object({
    division: z.string().min(1),
    district: z.string().min(1),
    upazila:  z.string().min(1),
    full:     z.string().min(5),
  }),
  contact: z.object({
    name:  z.string().min(2),
    phone: z.string().regex(/^(\+880|0)1[3-9]\d{8}$/, "Invalid phone number"),
    email: z.string().email().optional().or(z.literal("")),
  }),
  operatingHours: z.array(OperatingHourSchema).max(7),
});

export const ApplicationReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(10, "Reason must be at least 10 characters") }),
]);

export const SuspendSchema = z.object({
  reason: z.string().min(10, "Suspension reason must be at least 10 characters"),
});

export type CenterEditInput        = z.infer<typeof CenterEditSchema>;
export type ApplicationReviewInput = z.infer<typeof ApplicationReviewSchema>;
export type SuspendInput           = z.infer<typeof SuspendSchema>;
