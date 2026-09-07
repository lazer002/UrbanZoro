import mongoose from "mongoose";

const { Schema } = mongoose;

const DeviceTokenSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

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

    platform: {
      type: String,
      enum: [
        "android",
        "ios",
        "web",
        "unknown",
      ],
      default: "unknown",
    },

    provider: {
      type: String,
      enum: [
        "expo",
        "fcm",
        "apns",
      ],
      default: "expo",
    },

    deviceId: {
      type: String,
      default: null,
      index: true,
    },

    appVersion: {
      type: String,
      default: null,
    },

    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

DeviceTokenSchema.index({
  userId: 1,
  enabled: 1,
});

DeviceTokenSchema.index({
  guestId: 1,
  enabled: 1,
});

export const DeviceToken =
  mongoose.models.DeviceToken ||
  mongoose.model(
    "DeviceToken",
    DeviceTokenSchema
  );