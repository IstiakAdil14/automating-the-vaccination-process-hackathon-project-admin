import { Schema, model, models, Types, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const FRAUD_TYPES = {
  DUPLICATE_NID:    "DUPLICATE_NID",
  TAMPERED_QR:      "TAMPERED_QR",
  MULTI_LOCATION:   "MULTI_LOCATION",
  INVALID_BATCH:    "INVALID_BATCH",
} as const;

export const FRAUD_SEVERITY = {
  LOW:      "LOW",
  MEDIUM:   "MEDIUM",
  HIGH:     "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export const FRAUD_STATUS = {
  OPEN:           "OPEN",
  INVESTIGATING:  "INVESTIGATING",
  RESOLVED:       "RESOLVED",
  FALSE_POSITIVE: "FALSE_POSITIVE",
} as const;

export type FraudType     = (typeof FRAUD_TYPES)[keyof typeof FRAUD_TYPES];
export type FraudSeverity = (typeof FRAUD_SEVERITY)[keyof typeof FRAUD_SEVERITY];
export type FraudStatus   = (typeof FRAUD_STATUS)[keyof typeof FRAUD_STATUS];

/* --- Interface ---------------------------------------------------------------- */
export interface IFraudAlert extends Document {
  alertId:     string;
  type:        FraudType;
  severity:    FraudSeverity;
  userId?:     Types.ObjectId;
  centerId:    Types.ObjectId;
  staffId?:    Types.ObjectId;
  details:     Record<string, unknown>;
  status:      FraudStatus;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolution?: string;
  createdAt:   Date;
  updatedAt:   Date;
}

/* --- Schema ------------------------------------------------------------------- */
const FraudAlertSchema = new Schema<IFraudAlert>(
  {
    alertId: { type: String, required: true, unique: true, trim: true },

    type: {
      type:     String,
      enum:     Object.values(FRAUD_TYPES),
      required: true,
    },
    severity: {
      type:    String,
      enum:    Object.values(FRAUD_SEVERITY),
      default: FRAUD_SEVERITY.MEDIUM,
    },

    userId:   { type: Schema.Types.ObjectId, ref: "User" },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    staffId:  { type: Schema.Types.ObjectId, ref: "Staff" },

    /* Flexible payload - stores raw evidence (IPs, timestamps, NID duplicates, etc.) */
    details: { type: Schema.Types.Mixed, default: {} },

    status: {
      type:    String,
      enum:    Object.values(FRAUD_STATUS),
      default: FRAUD_STATUS.OPEN,
    },

    resolvedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    resolvedAt: { type: Date },
    resolution: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
FraudAlertSchema.index({ status: 1 });
FraudAlertSchema.index({ severity: 1 });
FraudAlertSchema.index({ type: 1 });
FraudAlertSchema.index({ centerId: 1 });
FraudAlertSchema.index({ userId: 1 },  { sparse: true });
FraudAlertSchema.index({ staffId: 1 }, { sparse: true });
FraudAlertSchema.index({ createdAt: -1 });
/* Compound: open high-severity alerts - most common admin query */
FraudAlertSchema.index({ status: 1, severity: 1, createdAt: -1 });

export const FraudAlert: Model<IFraudAlert> =
  (models.FraudAlert as Model<IFraudAlert>) ?? model<IFraudAlert>("FraudAlert", FraudAlertSchema);
