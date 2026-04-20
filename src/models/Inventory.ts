import { Schema, model, models, Types, type Document, type Model } from "mongoose";

/* --- Interface ---------------------------------------------------------------- */
export interface IInventory extends Document {
  inventoryId:       string;
  centerId:          Types.ObjectId;
  vaccineId:         Types.ObjectId;
  quantityOnHand:    number;
  dosesAdministered: number;
  expiryDate:        Date;
  batchNo:           string;
  lowStockThreshold: number;
  receivedAt:        Date;
  createdAt:         Date;
  updatedAt:         Date;

  /* Virtual */
  isLowStock: boolean;
  isExpired:  boolean;
}

/* --- Schema ------------------------------------------------------------------- */
const InventorySchema = new Schema<IInventory>(
  {
    inventoryId: { type: String, required: true, unique: true, trim: true },

    centerId:  { type: Schema.Types.ObjectId, ref: "Center",  required: true },
    vaccineId: { type: Schema.Types.ObjectId, ref: "Vaccine", required: true },

    quantityOnHand:    { type: Number, required: true, default: 0, min: 0 },
    dosesAdministered: { type: Number, default: 0, min: 0 },

    expiryDate:        { type: Date, required: true },
    batchNo:           { type: String, required: true, trim: true },
    lowStockThreshold: { type: Number, default: 50, min: 0 },
    receivedAt:        { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --- Virtuals ----------------------------------------------------------------- */
InventorySchema.virtual("isLowStock").get(function () {
  return this.quantityOnHand <= this.lowStockThreshold;
});

InventorySchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

/* --- Indexes ------------------------------------------------------------------ */
InventorySchema.index({ centerId: 1 });
InventorySchema.index({ vaccineId: 1 });
InventorySchema.index({ expiryDate: 1 });
InventorySchema.index({ centerId: 1, vaccineId: 1 });
InventorySchema.index({ quantityOnHand: 1 });

export const Inventory: Model<IInventory> =
  (models.Inventory as Model<IInventory>) ?? model<IInventory>("Inventory", InventorySchema);
