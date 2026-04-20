import { Schema, model, models, Types, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const SYNC_STATUS = {
  ONLINE:          "ONLINE",
  OFFLINE_PENDING: "OFFLINE_PENDING",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

/* --- Interface ---------------------------------------------------------------- */
export interface IVaccinationRecord extends Document {
  recordId:       string;
  userId:         Types.ObjectId;
  centerId:       Types.ObjectId;
  staffId:        Types.ObjectId;
  vaccineId:      Types.ObjectId;
  doseNumber:     number;
  batchNo:        string;
  lotNo:          string;
  expiryDate:     Date;
  administeredAt: Date;
  syncStatus:     SyncStatus;
  notes?:         string;
  createdAt:      Date;
  updatedAt:      Date;
}

/* --- Schema ------------------------------------------------------------------- */
const VaccinationRecordSchema = new Schema<IVaccinationRecord>(
  {
    recordId: { type: String, required: true, unique: true, trim: true },

    userId:   { type: Schema.Types.ObjectId, ref: "User",    required: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center",  required: true },
    staffId:  { type: Schema.Types.ObjectId, ref: "Staff",   required: true },
    vaccineId:{ type: Schema.Types.ObjectId, ref: "Vaccine", required: true },

    doseNumber: { type: Number, required: true, min: 1 },
    batchNo:    { type: String, required: true, trim: true },
    lotNo:      { type: String, required: true, trim: true },
    expiryDate: { type: Date,   required: true },

    administeredAt: { type: Date, required: true, default: Date.now },

    syncStatus: {
      type:    String,
      enum:    Object.values(SYNC_STATUS),
      default: SYNC_STATUS.ONLINE,
    },

    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
/* Prevent duplicate dose records for the same user+vaccine+dose */
VaccinationRecordSchema.index(
  { userId: 1, vaccineId: 1, doseNumber: 1 },
  { unique: true }
);
VaccinationRecordSchema.index({ administeredAt: -1 });
VaccinationRecordSchema.index({ syncStatus: 1 });
VaccinationRecordSchema.index({ batchNo: 1 });

export const VaccinationRecord: Model<IVaccinationRecord> =
  (models.VaccinationRecord as Model<IVaccinationRecord>) ??
  model<IVaccinationRecord>("VaccinationRecord", VaccinationRecordSchema);
