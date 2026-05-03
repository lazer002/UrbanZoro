import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // 📊 Status
    subscribed: {
      type: Boolean,
      default: true,
    },

    // 🧠 Segmentation (VERY IMPORTANT)
    tags: [String], // e.g. ["new_user", "buyer", "vip"]

    source: {
      type: String,
      enum: ["footer", "checkout", "popup", "manual"],
      default: "footer",
    },

    // 📅 Engagement tracking
    lastEmailSentAt: Date,
    lastOpenedAt: Date,

    // 🔗 Optional user link
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ❌ Unsubscribe tracking
    unsubscribedAt: Date,
    unsubscribeReason: String,

    // 🌐 Metadata
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

export const Newsletter = mongoose.model("Newsletter", newsletterSchema);