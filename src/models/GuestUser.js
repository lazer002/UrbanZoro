import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
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
    trim: true,
  },

  state: {
    type: String,
    trim: true,
  },

  zip: {
    type: String,
    trim: true,
  },

  isDefault: {
    type: Boolean,
    default: false,
  },
});

const GuestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please enter a valid email address",
      ],
      index: true,
    },

    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\d{7,15}$/,
        "Please enter a valid phone number",
      ],
    },

    /* ============================
       MULTIPLE SAVED ADDRESSES
    ============================ */

    addresses: {
      type: [AddressSchema],
      default: [],
    },

    subscribeNews: {
      type: Boolean,
      default: false,
    },

    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const GuestUser = mongoose.model(
  "GuestUser",
  GuestSchema
);