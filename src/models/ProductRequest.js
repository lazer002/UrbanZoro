import mongoose from "mongoose";

const productRequestSchema = new mongoose.Schema(
  {
    // 🔗 Product reference
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // 👤 User / Guest
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

guestId: {
  type: String,
  index: true,
},

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // 👕 Requested variant
    size: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },

    // 📊 Status tracking
    status: {
      type: String,
      enum: ["pending", "notified", "fulfilled"],
      default: "pending",
    },

    // 📅 Notification tracking
    notifiedAt: Date,

    // 🌐 Metadata (very useful later)
    ipAddress: String,
    userAgent: String,

    source: {
      type: String,
      enum: ["product_page", "wishlist", "cart"],
      default: "product_page",
    },
  },
  { timestamps: true }
);

productRequestSchema.index(
  { productId: 1, email: 1, size: 1 },
  { unique: true }
);

export const ProductRequest = mongoose.model(
  "ProductRequest",
  productRequestSchema
);