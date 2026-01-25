import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    address: { type: String, required: true, trim: true },
    apartment: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: "Delhi" },
    zip: { type: String, trim: true, default: "110045" },
    country: { type: String, trim: true, default: "India" },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{7,15}$/, "Please enter a valid phone number"],
    },
    subscribeNews: { type: Boolean, default: false },
    // store guest order references
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

export const GuestUser = mongoose.model("GuestUser", GuestSchema);
