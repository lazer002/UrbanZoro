import mongoose from "mongoose";
import crypto from "crypto";

const { Schema } = mongoose;

const bundleSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      immutable: true,
      default: () => crypto.randomUUID(),
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],

    category: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    mainImages: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    published: {
      type: Boolean,
      default: true,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isNewBundle: {
      type: Boolean,
      default: false,
      index: true,
    },

    onSale: {
      type: Boolean,
      default: false,
      index: true,
    },
isCustomBundle:{
 type: Boolean,
      default: false,
        index: true,
          required: true,
},
    isOutOfStock: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

bundleSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/&/g, "-and-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (
    this.oldPrice &&
    this.oldPrice > this.price &&
    this.price >= 0
  ) {
    this.discount = Math.round(
      ((this.oldPrice - this.price) /
        this.oldPrice) *
        100
    );
  } else {
    this.discount = 0;
  }

  this.onSale = this.discount > 0;

  if (this.category) {
    this.category = this.category
      .toLowerCase()
      .trim();
  }

  if (Array.isArray(this.tags)) {
    this.tags = this.tags
      .map((tag) => tag.toLowerCase().trim())
      .filter(Boolean);
  }

  next();
});

bundleSchema.index({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
});

export const Bundle = mongoose.model(
  "Bundle",
  bundleSchema
);