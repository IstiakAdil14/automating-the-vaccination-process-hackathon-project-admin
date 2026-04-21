import { Schema, model, models, type Document, type Model } from "mongoose";

export interface INidRecord extends Document {
  nid:          string;
  userId?:      Schema.Types.ObjectId;
  addedBy:      "admin" | "self";
  registeredAt: Date;
}

const NidRecordSchema = new Schema<INidRecord>({
  nid:          { type: String, required: true, unique: true, trim: true },
  userId:       { type: Schema.Types.ObjectId, ref: "User", default: null },
  addedBy:      { type: String, enum: ["admin", "self"], default: "admin" },
  registeredAt: { type: Date, default: Date.now },
});

export const NidRecord: Model<INidRecord> =
  (models.NidRecord as Model<INidRecord>) ?? model<INidRecord>("NidRecord", NidRecordSchema);
