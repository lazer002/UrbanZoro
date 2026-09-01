import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ================= ADDRESS ================= */

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    zip: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

/* ================= USER ================= */

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC ================= */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

 passwordHash: {
  type: String,
  required: true,
  select: false,
},

    /* ================= AUTH ================= */

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    /* ================= ECOMMERCE ================= */

    /*
     * IMPORTANT:
     * Wishlist uses Product.publicId.
     *
     * Example:
     * "a0908bfc-fcef-4c34-8d5f-f586c053ceed"
     */
    wishlist: {
      type: [String],
      default: [],
    },

    /*
     * Keep cart as Mixed only if your cart structure
     * is intentionally flexible.
     *
     * For a large app, a separate Cart collection is
     * usually better.
     */
    cart: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    /* ================= ADDRESSES ================= */

    addresses: {
      type: [addressSchema],
      default: [],
    },

    /* ================= ORDERS ================= */

    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    /* ================= PLATFORM ================= */

    loginSource: {
      type: String,
      enum: ["web", "android", "ios"],
      index: true,
    },

    /* ================= ACCOUNT ================= */

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastLogin: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
      index: true,
    },

    /* ================= PREFERENCES ================= */

    preferences: {
      newsletter: {
        type: Boolean,
        default: true,
      },

      notifications: {
        type: Boolean,
        default: true,
      },
    },

    /* ================= TAGS ================= */

    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

userSchema.index({
  email: 1,
});

userSchema.index({
  status: 1,
  role: 1,
});

userSchema.index({
  createdAt: -1,
});

userSchema.index({
  lastLogin: -1,
});

/* ================= METHODS ================= */

userSchema.methods.verifyPassword = function (password) {
  if (!this.passwordHash) return false;

  return bcrypt.compare(
    password,
    this.passwordHash
  );
};

userSchema.statics.hashPassword = async function (
  password
) {
  const salt = await bcrypt.genSalt(10);

  return bcrypt.hash(
    password,
    salt
  );
};

export const User =
  mongoose.model("User", userSchema);