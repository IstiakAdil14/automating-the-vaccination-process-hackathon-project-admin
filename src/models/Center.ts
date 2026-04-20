import { Schema, model, models, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const CENTER_TYPES = {
  GOVT_HOSPITAL:   "GOVT_HOSPITAL",
  PRIVATE_CLINIC:  "PRIVATE_CLINIC",
  COMMUNITY:       "COMMUNITY",
  MOBILE:          "MOBILE",
} as const;

export const CENTER_STATUS = {
  PENDING:   "PENDING",
  ACTIVE:    "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type CenterType   = (typeof CENTER_TYPES)[keyof typeof CENTER_TYPES];
export type CenterStatus = (typeof CENTER_STATUS)[keyof typeof CENTER_STATUS];

/* --- Sub-document interfaces -------------------------------------------------- */
interface IAddress {
  division:  string;
  district:  string;
  upazila:   string;
  full:      string;
}

interface IContact {
  name:   string;
  phone:  string;
  email?: string;
}

interface IOperatingHour {
  day:           number;   /* 0 = Sunday - 6 = Saturday */
  morningStart?: string;   /* "HH:MM" 24h */
  morningEnd?:   string;
  eveningStart?: string;
  eveningEnd?:   string;
}

/* --- Main interface ----------------------------------------------------------- */
export interface ICenter extends Document {
  centerId:          string;
  name:              string;
  licenseNo:         string;
  type:              CenterType;
  geoLat:            number;
  geoLng:            number;
  address:           IAddress;
  contact:           IContact;
  operatingHours:    IOperatingHour[];
  status:            CenterStatus;
  dailyCapacity:     number;
  approvedAt?:       Date;
  suspendedReason?:  string;
  totalVaccinations: number;
  createdAt:         Date;
  updatedAt:         Date;
}

/* --- Schema ------------------------------------------------------------------- */
const OperatingHourSchema = new Schema<IOperatingHour>(
  {
    day:          { type: Number, required: true, min: 0, max: 6 },
    morningStart: { type: String },
    morningEnd:   { type: String },
    eveningStart: { type: String },
    eveningEnd:   { type: String },
  },
  { _id: false }
);

const CenterSchema = new Schema<ICenter>(
  {
    centerId:  { type: String, required: true, unique: true, trim: true },
    name:      { type: String, required: true, trim: true },
    licenseNo: { type: String, required: true, unique: true, trim: true },
    type: {
      type:     String,
      enum:     Object.values(CENTER_TYPES),
      required: true,
      default:  CENTER_TYPES.GOVT_HOSPITAL,
    },

    geoLat: { type: Number, required: true },
    geoLng: { type: Number, required: true },

    address: {
      division: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      upazila:  { type: String, required: true, trim: true },
      full:     { type: String, required: true, trim: true },
    },

    contact: {
      name:  { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },

    operatingHours: { type: [OperatingHourSchema], default: [] },

    status: {
      type:    String,
      enum:    Object.values(CENTER_STATUS),
      default: CENTER_STATUS.PENDING,
    },

    dailyCapacity:     { type: Number, required: true, default: 100 },
    approvedAt:        { type: Date },
    suspendedReason:   { type: String, trim: true },
    totalVaccinations: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
CenterSchema.index({ geoLat: 1, geoLng: 1 });
CenterSchema.index({ status: 1 });
CenterSchema.index({ "address.division": 1 });
CenterSchema.index({ "address.district": 1 });
CenterSchema.index({ type: 1 });

export const Center: Model<ICenter> =
  (models.Center as Model<ICenter>) ?? model<ICenter>("Center", CenterSchema);
