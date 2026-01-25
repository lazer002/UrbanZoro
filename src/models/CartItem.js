import mongoose from "mongoose";

const bundleProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  size: { type: String },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  guestId: { type: String, index: true },

  // Single product
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  size: { type: String },

  // Bundle
  bundle: { type: mongoose.Schema.Types.ObjectId, ref: "Bundle" },
  mainImage: { type: String },
  bundleProducts: { type: [bundleProductSchema], default: undefined },

  quantity: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

// Clean up fields automatically
cartItemSchema.pre("validate", function(next) {
  if (this.bundle) {
    this.product = undefined;
    this.size = undefined;
  }
  next();
});

// --- Single product unique indexes ---
cartItemSchema.index(
  { user: 1, product: 1, size: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true, $ne: null },
      product: { $exists: true, $ne: null },
      bundle: { $exists: false },
    },
  }
);

cartItemSchema.index(
  { guestId: 1, product: 1, size: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestId: { $exists: true, $ne: null },
      product: { $exists: true, $ne: null },
      bundle: { $exists: false },
    },
  }
);

// --- Bundles: one per user/guest ---
cartItemSchema.index(
  { user: 1, bundle: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true, $ne: null },
      bundle: { $exists: true },
    },
  }
);

cartItemSchema.index(
  { guestId: 1, bundle: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestId: { $exists: true, $ne: null },
      bundle: { $exists: true },
    },
  }
);

export const CartItem = mongoose.model("CartItem", cartItemSchema);
    