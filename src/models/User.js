import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* 🔥 ADDRESS SCHEMA */
const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },

    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },

    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    // Basic info
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    name: { type: String, required: true },
    passwordHash: { type: String },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    googleId: { type: String, unique: true, sparse: true, index: true },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },

    /* 🔥 ECOMMERCE */

    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },

    cart: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    /* 🔥 FIXED ADDRESSES */
    addresses: {
      type: [addressSchema],
      default: [],
    },

    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    loginSource: {
      type: String,
      enum: ["web", "android", "ios"],
    },

    /* 🔐 ACCOUNT */

    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },

    preferences: {
      newsletter: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

/* 🔑 METHODS */

userSchema.methods.verifyPassword = function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model("User", userSchema);