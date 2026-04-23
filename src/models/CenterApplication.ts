import { Schema, model, models, type Document, type Model } from "mongoose";

export interface ICenterApplication extends Document {
  referenceNumber: string;
  centerName: string;
  licenseNumber: string;
  centerType: string;
  establishedYear: number;
  division: string;
  district: string;
  localBodyType: string;
  upazila: string;
  address: string;
  geoLat?: number;
  geoLng?: number;
  contactName: string;
  designation: string;
  phone: string;
  email: string;
  facilityLicenseUrl: string;
  centerPhotoUrl: string;
  officerNidUrl: string;
  hashedPassword?: string;
  capacity?: number;
  vaccines?: string[];
  status: "pending_review" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CenterApplicationSchema = new Schema<ICenterApplication>(
  {
    referenceNumber:    { type: String, required: true, unique: true },
    centerName:         { type: String, required: true },
    licenseNumber:      { type: String, required: true },
    centerType:         { type: String, required: true },
    establishedYear:    { type: Number, required: true },
    division:           { type: String, required: true },
    district:           { type: String, required: true },
    localBodyType:      { type: String, required: true },
    upazila:            { type: String },
    address:            { type: String, required: true },
    geoLat:             { type: Number },
    geoLng:             { type: Number },
    contactName:        { type: String, required: true },
    designation:        { type: String, required: true },
    phone:              { type: String, required: true },
    email:              { type: String, required: true, lowercase: true },
    facilityLicenseUrl: { type: String, required: true },
    centerPhotoUrl:     { type: String },
    officerNidUrl:      { type: String, required: true },
    hashedPassword:     { type: String },
    capacity:           { type: Number },
    vaccines:           { type: [String] },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    rejectionReason: { type: String },
  },
  { timestamps: true, collection: "center_applications" }
);

export const CenterApplication: Model<ICenterApplication> =
  (models.CenterApplication as Model<ICenterApplication>) ??
  model<ICenterApplication>("CenterApplication", CenterApplicationSchema);
