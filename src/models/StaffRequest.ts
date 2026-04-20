import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export const REQUEST_TYPES = {
  NEW_HIRE:  "NEW_HIRE",
  TRANSFER:  "TRANSFER",
  REMOVAL:   "REMOVAL",
} as const;

export const REQUEST_STATUS = {
  PENDING:  "PENDING",
  APPROVED: "APPROVED",
  DENIED:   "DENIED",
} as const;

export const REQUEST_URGENCY = {
  LOW:    "LOW",
  MEDIUM: "MEDIUM",
  HIGH:   "HIGH",
} as const;

export type RequestType    = (typeof REQUEST_TYPES)[keyof typeof REQUEST_TYPES];
export type RequestStatus  = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];
export type RequestUrgency = (typeof REQUEST_URGENCY)[keyof typeof REQUEST_URGENCY];

export interface IStaffRequest extends Document {
  centerId:     Types.ObjectId;
  staffId?:     Types.ObjectId;   /* for TRANSFER / REMOVAL */
  type:         RequestType;
  urgency:      RequestUrgency;
  reason:       string;
  requestedRole?: string;
  status:       RequestStatus;
  reviewedBy?:  Types.ObjectId;
  reviewNote?:  string;
  reviewedAt?:  Date;
  createdAt:    Date;
  updatedAt:    Date;
}

const StaffRequestSchema = new Schema<IStaffRequest>(
  {
    centerId:      { type: Schema.Types.ObjectId, ref: "Center", required: true },
    staffId:       { type: Schema.Types.ObjectId, ref: "Staff" },
    type:          { type: String, enum: Object.values(REQUEST_TYPES), required: true },
    urgency:       { type: String, enum: Object.values(REQUEST_URGENCY), default: REQUEST_URGENCY.MEDIUM },
    reason:        { type: String, required: true, trim: true },
    requestedRole: { type: String },
    status:        { type: String, enum: Object.values(REQUEST_STATUS), default: REQUEST_STATUS.PENDING },
    reviewedBy:    { type: Schema.Types.ObjectId, ref: "Admin" },
    reviewNote:    { type: String, trim: true },
    reviewedAt:    { type: Date },
  },
  { timestamps: true }
);

StaffRequestSchema.index({ status: 1 });
StaffRequestSchema.index({ centerId: 1 });
StaffRequestSchema.index({ createdAt: -1 });

export const StaffRequest: Model<IStaffRequest> =
  (models.StaffRequest as Model<IStaffRequest>) ??
  model<IStaffRequest>("StaffRequest", StaffRequestSchema);
