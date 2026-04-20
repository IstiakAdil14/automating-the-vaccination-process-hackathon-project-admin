import { Schema, model, models, type Document, type Model } from "mongoose";

/* --- Enums -------------------------------------------------------------------- */
export const VACCINE_STATUS = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const;

/* --- Interface ---------------------------------------------------------------- */
export interface IVaccine extends Document {
  vaccineId:        string;
  name:             string;
  shortName:        string;
  whoCode?:         string;
  manufacturer?:    string;
  schedule: {
    doses:          number;
    intervalDays:   number[];   /* length = doses - 1 */
  };
  ageEligibility: {
    minYears:       number;
    maxYears?:      number;
  };
  contraindications: string[];
  storageTemp: {
    minCelsius:     number;
    maxCelsius:     number;
  };
  isActive:         boolean;
  createdAt:        Date;
  updatedAt:        Date;
}

/* --- Schema ------------------------------------------------------------------- */
const VaccineSchema = new Schema<IVaccine>(
  {
    vaccineId:   { type: String, required: true, unique: true, trim: true },
    name:        { type: String, required: true, trim: true },
    shortName:   { type: String, required: true, trim: true, uppercase: true },
    whoCode:     { type: String, trim: true },
    manufacturer:{ type: String, trim: true },

    schedule: {
      doses:        { type: Number, required: true, min: 1 },
      intervalDays: { type: [Number], default: [] },
    },

    ageEligibility: {
      minYears: { type: Number, required: true, default: 0 },
      maxYears: { type: Number },
    },

    contraindications: { type: [String], default: [] },

    storageTemp: {
      minCelsius: { type: Number, default: 2 },
      maxCelsius: { type: Number, default: 8 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VaccineSchema.index({ isActive: 1 });
VaccineSchema.index({ shortName: 1 });

export const Vaccine: Model<IVaccine> =
  (models.Vaccine as Model<IVaccine>) ?? model<IVaccine>("Vaccine", VaccineSchema);
