import mongoose from "mongoose";
import crypto from "crypto";
import { getNextProductSeq } from "./Counter.js";

const SIZE_TYPES = {
  apparel: ["XS", "S", "M", "L", "XL", "XXL"],
  pants: ["28", "30", "32", "34", "36", "38", "40"],
};

const productSchema = new mongoose.Schema(
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
   details: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      min: 0,
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

    images: {
      type: [String],
      default: [],
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },

sizes: [
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
],

category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: true,
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

    onSale: {
      type: Boolean,
      default: false,
      index: true,
    },

    isNewProduct: {
      type: Boolean,
      default: false,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    seo: {
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
    },
    isOutOfStock: {
  type: Boolean,
  default: true,
  index: true,
},

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
  sku: "text",
});

productSchema.pre("validate", async function (next) {
  if (!this.publicId) {
    this.publicId = crypto.randomUUID();
  }

   if (!this.sku) {
    const seq = await getNextProductSeq();
    this.sku = `GAR-${String(seq).padStart(6, "0")}`;
  }

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
      ((this.oldPrice - this.price) / this.oldPrice) * 100
    );
  } else {
    this.discount = 0;
  }

  if (this.category) {
    this.category = this.category.toLowerCase().trim();
  }

  next();
});

export const Product = mongoose.model("Product", productSchema);