import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI =
  "mongodb+srv://adilschronicle731_db_user:3uEg2uyNdfrBChpB@cluster0.n1tlh4p.mongodb.net/vaccinationDB";

const AdminSchema = new mongoose.Schema(
  {
    name:           String,
    email:          { type: String, unique: true, lowercase: true, trim: true },
    hashedPassword: { type: String, select: false },
    role:           String,
    permissions:    [String],
    isActive:       Boolean,
    loginAttempts:  { type: Number, default: 0 },
    lockoutUntil:   Date,
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin ?? mongoose.model("Admin", AdminSchema);

await mongoose.connect(MONGODB_URI);

const hashed = await bcrypt.hash("Pass@123", 12);
const existing = await Admin.findOne({ email: "vaccinationbd428@gmail.com" }).select("+hashedPassword");

if (existing) {
  existing.hashedPassword = hashed;
  existing.isActive = true;
  existing.loginAttempts = 0;
  existing.lockoutUntil = undefined;
  await existing.save();
  console.log("Admin password updated.");
} else {
  await Admin.create({
    name:           "VaccinationBD Admin",
    email:          "vaccinationbd428@gmail.com",
    hashedPassword: hashed,
    role:           "SUPER_ADMIN",
    permissions:    [],
    isActive:       true,
  });
  console.log("Admin created.");
}

await mongoose.disconnect();
console.log("Done.");
