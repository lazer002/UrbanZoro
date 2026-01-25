import mongoose from "mongoose";

const { Schema, model } = mongoose;

const bundleSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // Array of product ObjectIds — each product has its own images
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },

    // ✅ Multiple main images for the bundle (user uploads them)
    mainImages: [
      {
        type: String, // store URLs
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Bundle = mongoose.model("Bundle", bundleSchema);
