import { z } from "zod";

const bdPhone = z.string().regex(/^(\+880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number");
const bdNid   = z.string().regex(/^\d{10}(\d{3})?$/, "NID must be 10 or 13 digits");

export const CreateStaffSchema = z.object({
  /* Step 1 */
  name:        z.string().min(2, "Name required").max(100),
  nid:         bdNid,
  phone:       bdPhone,
  email:       z.string().email("Invalid email"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  /* Step 2 */
  role:        z.enum(["VACCINATOR", "RECEPTIONIST", "SUPERVISOR"]),
  centerId:    z.string().min(1, "Center required"),
  shift:       z.enum(["morning", "evening", "both"]),
  /* Step 3 */
  sendCredentials: z.boolean().default(true),
});

export const StaffSuspendSchema = z.object({
  reason:      z.string().min(10, "Reason must be at least 10 characters"),
  durationType: z.enum(["temporary", "permanent"]),
  suspendUntil: z.string().optional(),
}).refine(
  (d) => d.durationType === "permanent" || (d.suspendUntil && d.suspendUntil.length > 0),
  { message: "End date required for temporary suspension", path: ["suspendUntil"] }
);

export const AssignStaffSchema = z.object({
  centerId: z.string().min(1, "Center required"),
  shift:    z.enum(["morning", "evening", "both"]),
});

export const RequestReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("deny"), reason: z.string().min(10, "Reason must be at least 10 characters") }),
]);

export const BulkImportRowSchema = z.object({
  name:        z.string().min(2),
  nid:         bdNid,
  phone:       bdPhone,
  email:       z.string().email(),
  dateOfBirth: z.string().min(1),
  role:        z.enum(["VACCINATOR", "RECEPTIONIST", "SUPERVISOR"]),
  centerId:    z.string().min(1),
  shift:       z.enum(["morning", "evening", "both"]),
});

export type CreateStaffInput   = z.infer<typeof CreateStaffSchema>;
export type StaffSuspendInput  = z.infer<typeof StaffSuspendSchema>;
export type AssignStaffInput   = z.infer<typeof AssignStaffSchema>;
export type RequestReviewInput = z.infer<typeof RequestReviewSchema>;
export type BulkImportRow      = z.infer<typeof BulkImportRowSchema>;
