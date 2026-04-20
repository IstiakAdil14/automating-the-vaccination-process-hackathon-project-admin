import { Schema, model, models, Types, type Document, type Model } from "mongoose";

/* --- PlatformConfig ----------------------------------------------------------- */
export interface IPlatformConfig extends Document {
  key:       string;
  value:     unknown;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    key:       { type: String, required: true, unique: true, trim: true },
    value:     { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);


export const PlatformConfig: Model<IPlatformConfig> =
  (models.PlatformConfig as Model<IPlatformConfig>) ??
  model<IPlatformConfig>("PlatformConfig", PlatformConfigSchema);

/* --- SettingsAudit ------------------------------------------------------------ */
export interface ISettingsAudit extends Document {
  adminId:      Types.ObjectId;
  adminName:    string;
  section:      string;
  key:          string;
  oldValue:     unknown;
  newValue:     unknown;
  irreversible: boolean;
  createdAt:    Date;
}

const SettingsAuditSchema = new Schema<ISettingsAudit>(
  {
    adminId:      { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    adminName:    { type: String, required: true },
    section:      { type: String, required: true },
    key:          { type: String, required: true },
    oldValue:     { type: Schema.Types.Mixed },
    newValue:     { type: Schema.Types.Mixed },
    irreversible: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Append-only: no updates or deletes allowed via application code
SettingsAuditSchema.index({ createdAt: -1 });
SettingsAuditSchema.index({ section: 1 });

export const SettingsAudit: Model<ISettingsAudit> =
  (models.SettingsAudit as Model<ISettingsAudit>) ??
  model<ISettingsAudit>("SettingsAudit", SettingsAuditSchema);

export { DEFAULT_PLATFORM_CONFIG } from "@/lib/platformDefaults";
