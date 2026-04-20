import { Schema, model, models, Types, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";

/* --- Enums -------------------------------------------------------------------- */
export const STAFF_ROLES = {
  VACCINATOR:   "VACCINATOR",
  RECEPTIONIST: "RECEPTIONIST",
  SUPERVISOR:   "SUPERVISOR",
} as const;

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

/* --- Interface ---------------------------------------------------------------- */
export interface IStaff extends Document {
  staffId:           string;
  nid:               string;
  name:              string;
  role:              StaffRole;
  centerId:          Types.ObjectId;
  phone:             string;
  email:             string;
  hashedPassword:    string;
  isActive:          boolean;
  isSuspended:       boolean;
  suspendedReason?:  string;
  shiftsWorked:      number;
  totalVaccinations: number;
  lastActive?:       Date;
  createdAt:         Date;
  updatedAt:         Date;

  comparePassword(plain: string): Promise<boolean>;
}

/* --- Schema ------------------------------------------------------------------- */
const StaffSchema = new Schema<IStaff>(
  {
    staffId: { type: String, required: true, unique: true, trim: true },
    nid: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      match:    [/^\d{10}(\d{3})?$/, "NID must be 10 or 13 digits"],
    },
    name:  { type: String, required: true, trim: true },
    role: {
      type:     String,
      enum:     Object.values(STAFF_ROLES),
      required: true,
      default:  STAFF_ROLES.VACCINATOR,
    },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    phone: {
      type:     String,
      required: true,
      trim:     true,
      match:    [/^(\+880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number"],
    },
    email: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    hashedPassword: { type: String, required: true, select: false },

    isActive:    { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspendedReason: { type: String, trim: true },

    shiftsWorked:      { type: Number, default: 0 },
    totalVaccinations: { type: Number, default: 0 },
    lastActive:        { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
StaffSchema.index({ centerId: 1 });
StaffSchema.index({ isActive: 1 });
StaffSchema.index({ role: 1 });

/* --- Pre-save: hash password -------------------------------------------------- */
StaffSchema.pre("save", async function (next) {
  if (!this.isModified("hashedPassword")) return next();
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, 12);
  next();
});

/* --- Methods ------------------------------------------------------------------ */
StaffSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.hashedPassword);
};

export const Staff: Model<IStaff> =
  (models.Staff as Model<IStaff>) ?? model<IStaff>("Staff", StaffSchema);
