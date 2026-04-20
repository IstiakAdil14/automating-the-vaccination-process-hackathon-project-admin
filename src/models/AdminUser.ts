import mongoose, { Schema, model, models } from "mongoose";

const AdminUserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["super_admin", "admin", "analyst"], default: "analyst" },
  },
  { timestamps: true }
);

export const AdminUser = models.AdminUser ?? model("AdminUser", AdminUserSchema);
