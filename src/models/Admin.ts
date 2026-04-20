import { Schema, model, models, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, ROLE_PERMISSIONS, type AdminRole, type Permission } from "@/lib/permissions";

/* --- Interface ---------------------------------------------------------------- */
export interface IAdmin extends Document {
  name:            string;
  email:           string;
  hashedPassword:  string;
  role:            AdminRole;
  permissions:     Permission[];
  division?:       string;
  district?:       string;
  isActive:        boolean;
  lastLogin?:      Date;
  loginAttempts:   number;
  lockoutUntil?:   Date;
  createdAt:       Date;
  updatedAt:       Date;

  /* Methods */
  comparePassword(plain: string): Promise<boolean>;
  isLocked(): boolean;
  incrementFailedAttempts(): Promise<void>;
}

interface IAdminModel extends Model<IAdmin> {}

/* --- Schema ------------------------------------------------------------------- */
const AdminSchema = new Schema<IAdmin, IAdminModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    hashedPassword: {
      type: String,
      required: true,
      select: false,   /* never returned in queries by default */
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.DIVISION_ADMIN,
    },
    permissions: {
      type: [String],
      default: function (this: IAdmin) {
        return ROLE_PERMISSIONS[this.role] ?? [];
      },
    },
    division: { type: String, trim: true },
    district:  { type: String, trim: true },
    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date },

    /* Brute-force protection */
    loginAttempts: { type: Number, default: 0 },
    lockoutUntil:  { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Indexes ------------------------------------------------------------------ */
AdminSchema.index({ role: 1 });
AdminSchema.index({ division: 1 });

/* --- Pre-save: hash password -------------------------------------------------- */
AdminSchema.pre("save", async function (next) {
  /* Only hash when hashedPassword field is new or modified */
  if (!this.isModified("hashedPassword")) return next();
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, 12);
  next();
});

/* --- Methods ------------------------------------------------------------------ */
AdminSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.hashedPassword);
};

AdminSchema.methods.isLocked = function (): boolean {
  if (!this.lockoutUntil) return false;
  return this.lockoutUntil > new Date();
};

AdminSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
  this.loginAttempts += 1;

  /* Lock after 5 failed attempts for 15 minutes */
  if (this.loginAttempts >= 5) {
    this.lockoutUntil  = new Date(Date.now() + 15 * 60 * 1000);
    this.loginAttempts = 0; /* reset counter after lockout is set */
  }

  await this.save();
};

/* --- Export ------------------------------------------------------------------- */
export const Admin: IAdminModel =
  (models.Admin as IAdminModel) ?? model<IAdmin, IAdminModel>("Admin", AdminSchema);
