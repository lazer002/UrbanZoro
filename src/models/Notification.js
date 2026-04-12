import mongoose from "mongoose";

const { Schema } = mongoose;

/* ---------- OPTIONAL PAYLOAD ---------- */
const PayloadSchema = new Schema(
  {
    orderId: { type: String, default: null },
    orderNumber: { type: String, default: null },

    returnId: { type: String, default: null },
    rmaNumber: { type: String, default: null },

    screen: { type: String, default: null }, // navigation
    params: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/* ---------- MAIN SCHEMA ---------- */

const NotificationSchema = new Schema(
  {
    /* ---------- TYPE ---------- */
    type: {
      type: String,
      enum: ["order", "return", "offer", "system"],
      default: "order",
      index: true,
    },

    /* ---------- CONTENT ---------- */
    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    /* ---------- TARGET ---------- */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    guestId: {
      type: String,
      default: null,
      index: true,
    },

    /* ---------- STATUS ---------- */
    read: {
      type: Boolean,
      default: false,
   
    },

    readAt: {
      type: Date,
      default: null,
    },

    /* ---------- EXTRA DATA ---------- */
    payload: {
      type: PayloadSchema,
      default: {},
    },

    /* ---------- PRIORITY ---------- */
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    /* ---------- EXPIRY (OPTIONAL) ---------- */
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ---------- INDEXES (PERFORMANCE) ---------- */

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ guestId: 1, createdAt: -1 });
NotificationSchema.index({ read: 1 });

/* ---------- EXPORT ---------- */

export const Notification = mongoose.model(
  "Notification",
  NotificationSchema
);