import { Schema, model, models, Types, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const NOTIF_CHANNELS = {
  SMS:    "SMS",
  EMAIL:  "EMAIL",
  IN_APP: "IN_APP",
} as const;

export const NOTIF_STATUS = {
  DRAFT:     "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENT:      "SENT",
} as const;

export type NotifChannel = (typeof NOTIF_CHANNELS)[keyof typeof NOTIF_CHANNELS];
export type NotifStatus  = (typeof NOTIF_STATUS)[keyof typeof NOTIF_STATUS];

/* --- Interface ---------------------------------------------------------------- */
export interface INotification extends Document {
  notifId:    string;
  createdBy:  Types.ObjectId;
  title:      string;
  body:       string;
  channels:   NotifChannel[];
  targetAudience: {
    roles:              string[];
    divisions:          string[];
    vaccinationStatus?: string;
  };
  scheduledAt?:  Date;
  sentAt?:       Date;
  deliveryStats: {
    sent:      number;
    delivered: number;
    failed:    number;
    opened:    number;
  };
  status:     NotifStatus;
  createdAt:  Date;
  updatedAt:  Date;
}

/* --- Schema ------------------------------------------------------------------- */
const NotificationSchema = new Schema<INotification>(
  {
    notifId:   { type: String, required: true, unique: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    body:  { type: String, required: true, trim: true, maxlength: 2000 },

    channels: {
      type:     [String],
      enum:     Object.values(NOTIF_CHANNELS),
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message:   "At least one channel is required",
      },
    },

    targetAudience: {
      roles:             { type: [String], default: [] },
      divisions:         { type: [String], default: [] },
      vaccinationStatus: { type: String },
    },

    scheduledAt: { type: Date },
    sentAt:      { type: Date },

    deliveryStats: {
      sent:      { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed:    { type: Number, default: 0 },
      opened:    { type: Number, default: 0 },
    },

    status: {
      type:    String,
      enum:    Object.values(NOTIF_STATUS),
      default: NOTIF_STATUS.DRAFT,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdBy: 1 });
NotificationSchema.index({ scheduledAt: 1 }, { sparse: true });
NotificationSchema.index({ sentAt: -1 },     { sparse: true });
NotificationSchema.index({ createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ??
  model<INotification>("Notification", NotificationSchema);
