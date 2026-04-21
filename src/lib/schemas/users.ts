import { z } from "zod";

export const SuspendCitizenSchema = z.object({
  reason:      z.enum(["FRAUDULENT_ACTIVITY", "DUPLICATE_NID", "SUPPORT_REQUEST", "OTHER"]),
  note:        z.string().min(10, "Note must be at least 10 characters"),
  durationType: z.enum(["temporary", "permanent"]),
  suspendUntil: z.string().optional(),
}).refine(
  (d) => d.durationType === "permanent" || (d.suspendUntil && d.suspendUntil.length > 0),
  { message: "End date required for temporary suspension", path: ["suspendUntil"] }
);

export const VerifyIdentitySchema = z.object({
  status:   z.enum(["VERIFIED", "FLAGGED"]),
  reason:   z.string().min(5, "Reason required").optional(),
  document: z.string().optional(), // base64 or URL
});

export const MergeAccountsSchema = z.object({
  primaryId:   z.string().min(1),
  secondaryId: z.string().min(1),
  action:      z.enum(["MERGE", "DISTINCT", "BLOCK_BOTH"]),
  note:        z.string().min(5, "Note required"),
});

export const AddNidUserSchema = z.object({
  nid: z.string().regex(/^\d{10}(\d{3})?$/, "NID must be 10 or 13 digits"),
});

export type SuspendCitizenInput  = z.infer<typeof SuspendCitizenSchema>;
export type VerifyIdentityInput  = z.infer<typeof VerifyIdentitySchema>;
export type MergeAccountsInput   = z.infer<typeof MergeAccountsSchema>;
export type AddNidUserInput      = z.infer<typeof AddNidUserSchema>;
