import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: "text" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    images: [{ type: String }],

    sku: { type: String, unique: true, required: true },

    // Track inventory per size
    inventory: {
      XS: { type: Number, default: 0 },
      S: { type: Number, default: 0 },
      M: { type: Number, default: 0 },
      L: { type: Number, default: 0 },
      XL: { type: Number, default: 0 },
      XXL: { type: Number, default: 0 },
    },

    published: { type: Boolean, default: true },
    onSale: { type: Boolean, default: false },
    isNewProduct: { type: Boolean, default: false },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    sizes: {
      type: [String],
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
      default: [],
    },
  },
  { timestamps: true }
);

// Auto-generate SKU if not provided
productSchema.pre("validate", async function (next) {
  if (!this.sku) {
    let newSku;
    let exists = true;

    while (exists) {
      newSku = Math.floor(10000000 + Math.random() * 9000000000).toString();
      exists = await mongoose.models.Product.findOne({ sku: newSku });
    }

    this.sku = newSku;
  }
  next();
});

export const Product = mongoose.model("Product", productSchema);
