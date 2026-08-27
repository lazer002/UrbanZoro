import mongoose from "mongoose";

const SIZE_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

stock: {
  type: Map,
  of: {
    type: Number,
    min: 0,
    default: 0,
  },
  default: {},
},

    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },

    trackInventory: {
      type: Boolean,
      default: true,
    },

    allowBackorder: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

inventorySchema.virtual("available").get(function () {
  if (!this.trackInventory) return Infinity;

  const totalStock = SIZE_VALUES.reduce(
    (total, size) => total + (this.stock?.[size] || 0),
    0
  );

  return Math.max(0, totalStock - this.reserved);
});

inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

inventorySchema.index({
  product: 1,
  active: 1,
});

export const Inventory = mongoose.model("Inventory", inventorySchema);