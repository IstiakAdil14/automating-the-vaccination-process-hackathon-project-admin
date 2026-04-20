import { Schema, model, models, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const VACCINATION_STATUS = {
  UNVACCINATED: "UNVACCINATED",
  PARTIAL:      "PARTIAL",
  COMPLETE:     "COMPLETE",
} as const;

export const GENDER = {
  MALE:   "MALE",
  FEMALE: "FEMALE",
  OTHER:  "OTHER",
} as const;

export type VaccinationStatus = (typeof VACCINATION_STATUS)[keyof typeof VACCINATION_STATUS];
export type Gender             = (typeof GENDER)[keyof typeof GENDER];

/* --- Interface ---------------------------------------------------------------- */
export interface IUser extends Document {
  userId:            string;
  nid:               string;
  name:              string;
  phone:             string;
  email?:            string;
  dateOfBirth:       Date;
  gender:            Gender;
  address: {
    division:        string;
    district:        string;
    upazila:         string;
    full?:           string;
  };
  isVerified:        boolean;
  isSuspended:       boolean;
  suspendedReason?:  string;
  vaccinationStatus: VaccinationStatus;
  createdAt:         Date;
  updatedAt:         Date;
}

/* --- Schema ------------------------------------------------------------------- */
const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    nid: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      match:    [/^\d{10}(\d{3})?$/, "NID must be 10 or 13 digits"],
    },
    name:  { type: String, required: true, trim: true },
    phone: {
      type:     String,
      required: true,
      trim:     true,
      match:    [/^(\+880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number"],
    },
    email: { type: String, trim: true, lowercase: true },

    dateOfBirth: { type: Date, required: true },
    gender: {
      type:     String,
      enum:     Object.values(GENDER),
      required: true,
    },

    address: {
      division: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      upazila:  { type: String, required: true, trim: true },
      full:     { type: String, trim: true },
    },

    isVerified:   { type: Boolean, default: false },
    isSuspended:  { type: Boolean, default: false },
    suspendedReason: { type: String, trim: true },

    vaccinationStatus: {
      type:    String,
      enum:    Object.values(VACCINATION_STATUS),
      default: VACCINATION_STATUS.UNVACCINATED,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 },  { sparse: true });
UserSchema.index({ "address.division": 1 });
UserSchema.index({ "address.district": 1 });
UserSchema.index({ vaccinationStatus: 1 });
UserSchema.index({ isSuspended: 1 });

export const User: Model<IUser> =
  (models.User as Model<IUser>) ?? model<IUser>("User", UserSchema);
