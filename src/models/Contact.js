import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    // 👤 User Info
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    // 💬 Message
    subject: { type: String, trim: true },
    message: { type: String, required: true },

    // 🧠 System fields
    status: {
      type: String,
      enum: ["new", "open", "in_progress", "resolved", "closed"],
      default: "new",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // 🔗 Optional linking
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

    // 🧾 Admin handling
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: [
      {
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // 🌐 Metadata (very useful)
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ["web", "mobile", "admin"],
      default: "web",
    },
  },
  { timestamps: true }
);

export const Contact = mongoose.model("Contact", contactSchema);