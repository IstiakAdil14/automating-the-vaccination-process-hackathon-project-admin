import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export const BROADCAST_STATUS = {
  DRAFT:     "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENDING:   "SENDING",
  SENT:      "SENT",
  FAILED:    "FAILED",
} as const;

export type BroadcastStatus = (typeof BROADCAST_STATUS)[keyof typeof BROADCAST_STATUS];

export interface IBroadcast extends Document {
  broadcastId:  string;
  title:        string;
  smsBody?:     string;
  emailSubject?: string;
  emailHtml?:   string;
  inAppBody?:   string;
  channels:     string[];
  audience: {
    roles:              string[];
    divisions:          string[];
    districts:          string[];
    vaccinationStatus?: string;
    ageMin?:            number;
    ageMax?:            number;
    gender?:            string;
  };
  schedule?: {
    sendAt:     Date;
    recurring?: "DAILY" | "WEEKLY";
    weekDays?:  number[];
  };
  status:       BroadcastStatus;
  sentBy:       Types.ObjectId;
  sentAt?:      Date;
  estimatedRecipients: number;
  deliveryStats: {
    sms:    { sent: number; delivered: number; failed: number };
    email:  { sent: number; delivered: number; failed: number; opened: number };
    inApp:  { sent: number; delivered: number; failed: number };
  };
  failureReasons: { reason: string; count: number }[];
  createdAt:    Date;
  updatedAt:    Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    broadcastId:  { type: String, required: true, unique: true, trim: true },
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    smsBody:      { type: String, trim: true, maxlength: 1600 },
    emailSubject: { type: String, trim: true, maxlength: 200 },
    emailHtml:    { type: String },
    inAppBody:    { type: String, trim: true, maxlength: 2000 },
    channels:     { type: [String], required: true },
    audience: {
      roles:             { type: [String], default: [] },
      divisions:         { type: [String], default: [] },
      districts:         { type: [String], default: [] },
      vaccinationStatus: { type: String },
      ageMin:            { type: Number },
      ageMax:            { type: Number },
      gender:            { type: String },
    },
    schedule: {
      sendAt:    { type: Date },
      recurring: { type: String, enum: ["DAILY", "WEEKLY"] },
      weekDays:  { type: [Number] },
    },
    status:  { type: String, enum: Object.values(BROADCAST_STATUS), default: BROADCAST_STATUS.DRAFT },
    sentBy:  { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    sentAt:  { type: Date },
    estimatedRecipients: { type: Number, default: 0 },
    deliveryStats: {
      sms:   { sent: { type: Number, default: 0 }, delivered: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
      email: { sent: { type: Number, default: 0 }, delivered: { type: Number, default: 0 }, failed: { type: Number, default: 0 }, opened: { type: Number, default: 0 } },
      inApp: { sent: { type: Number, default: 0 }, delivered: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
    },
    failureReasons: [{ reason: String, count: Number }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

BroadcastSchema.index({ status: 1 });
BroadcastSchema.index({ sentBy: 1 });
BroadcastSchema.index({ createdAt: -1 });
BroadcastSchema.index({ "schedule.sendAt": 1 }, { sparse: true });

export const Broadcast: Model<IBroadcast> =
  (models.Broadcast as Model<IBroadcast>) ?? model<IBroadcast>("Broadcast", BroadcastSchema);
