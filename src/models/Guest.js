import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    wishlist: [{ type: String }],

    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d", 
    },
  },
  { timestamps: true }
);

export const Guest = mongoose.model("Guest", GuestSchema);