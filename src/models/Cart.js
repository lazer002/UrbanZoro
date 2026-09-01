import mongoose from "mongoose";

/* =========================================================
   BUNDLE PRODUCT
========================================================= */

const bundleProductSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: null,
      trim: true,
    },

    title: {
      type: String,
      default: null,
      trim: true,
    },

    image: {
      type: String,
      default: null,
      trim: true,
    },

    size: {
      type: String,
      default: null,
      trim: true,
    },

    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   BUNDLE
========================================================= */

const bundleSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    mainImage: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   CART ITEM
========================================================= */

const cartItemSchema = new mongoose.Schema(
  {
    /* =======================================================
       OWNER
    ======================================================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    guestId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    /* =======================================================
       TYPE
    ======================================================= */

    type: {
      type: String,
      enum: ["product", "bundle"],
      required: true,
      index: true,
    },

    /* =======================================================
       NORMAL PRODUCT
    ======================================================= */

    publicId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    sku: {
      type: String,
      default: null,
      trim: true,
    },

    title: {
      type: String,
      default: null,
      trim: true,
    },

    mainImage: {
      type: String,
      default: null,
      trim: true,
    },

    size: {
      type: String,
      default: null,
      trim: true,
    },

    /* =======================================================
       BUNDLE

       IMPORTANT:
       default: undefined prevents Mongoose from
       creating bundle: {} for normal products.
    ======================================================= */

    isCustomBundle: {
      type: Boolean,
      default: false,
    },

    bundle: {
      type: bundleSchema,
      default: undefined,
    },

    bundleProducts: {
      type: [bundleProductSchema],
      default: undefined,
    },

    /* =======================================================
       QUANTITY
    ======================================================= */

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
   VALIDATION
========================================================= */

cartItemSchema.pre("validate", function (next) {
  const hasUser = Boolean(this.user);
  const hasGuest = Boolean(
    this.guestId &&
      String(this.guestId).trim()
  );

  if (!hasUser && !hasGuest) {
    return next(
      new Error(
        "Cart item requires user or guestId"
      )
    );
  }

  if (hasUser && hasGuest) {
    return next(
      new Error(
        "Cart item cannot have both user and guestId"
      )
    );
  }

  /* =======================================================
     NORMAL PRODUCT
  ======================================================= */

  if (this.type === "product") {
    if (!this.publicId) {
      return next(
        new Error(
          "Product publicId is required"
        )
      );
    }

    if (!this.size) {
      return next(
        new Error(
          "Product size is required"
        )
      );
    }

    /*
     * Remove every bundle field.
     */
    this.isCustomBundle = false;

    this.bundle = undefined;

    this.bundleProducts = undefined;

    return next();
  }

  /* =======================================================
     BUNDLE
  ======================================================= */

  if (this.type === "bundle") {
    if (!this.bundle) {
      return next(
        new Error(
          "Bundle data is required"
        )
      );
    }

    if (!this.bundle.title) {
      return next(
        new Error(
          "Bundle title is required"
        )
      );
    }

    if (
      this.bundle.price === undefined ||
      this.bundle.price === null
    ) {
      return next(
        new Error(
          "Bundle price is required"
        )
      );
    }

    if (
      !Array.isArray(
        this.bundleProducts
      ) ||
      this.bundleProducts.length === 0
    ) {
      return next(
        new Error(
          "Bundle products are required"
        )
      );
    }

    /*
     * Custom bundle:
     * bundle.publicId = null
     */
    if (this.isCustomBundle) {
      this.bundle.publicId = null;
    }

    /*
     * Prebuilt bundle:
     * bundle.publicId required.
     */
    if (
      !this.isCustomBundle &&
      !this.bundle.publicId
    ) {
      return next(
        new Error(
          "Prebuilt bundle publicId is required"
        )
      );
    }

    /*
     * Remove normal product fields.
     */
    this.publicId = undefined;
    this.sku = undefined;
    this.title = undefined;
    this.mainImage = undefined;
    this.size = undefined;

    return next();
  }

  return next(
    new Error(
      "Invalid cart item type"
    )
  );
});

/* =========================================================
   PRODUCT UNIQUE INDEX
========================================================= */

cartItemSchema.index(
  {
    user: 1,
    publicId: 1,
    size: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      user: {
        $exists: true,
        $ne: null,
      },

      type: "product",

      publicId: {
        $exists: true,
        $ne: null,
      },
    },
  }
);

cartItemSchema.index(
  {
    guestId: 1,
    publicId: 1,
    size: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      guestId: {
        $exists: true,
        $ne: null,
      },

      type: "product",

      publicId: {
        $exists: true,
        $ne: null,
      },
    },
  }
);

/* =========================================================
   PREBUILT BUNDLE UNIQUE INDEX
========================================================= */

cartItemSchema.index(
  {
    user: 1,
    "bundle.publicId": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      user: {
        $exists: true,
        $ne: null,
      },

      type: "bundle",

      isCustomBundle: false,

      "bundle.publicId": {
        $exists: true,
        $ne: null,
      },
    },
  }
);

cartItemSchema.index(
  {
    guestId: 1,
    "bundle.publicId": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      guestId: {
        $exists: true,
        $ne: null,
      },

      type: "bundle",

      isCustomBundle: false,

      "bundle.publicId": {
        $exists: true,
        $ne: null,
      },
    },
  }
);

/* =========================================================
   QUERY INDEXES
========================================================= */

cartItemSchema.index({
  user: 1,
  updatedAt: -1,
});

cartItemSchema.index({
  guestId: 1,
  updatedAt: -1,
});

cartItemSchema.index({
  type: 1,
});

cartItemSchema.index({
  "bundle.publicId": 1,
});

/* =========================================================
   EXPORT
========================================================= */

export const CartItem =
  mongoose.models.CartItem ||
  mongoose.model(
    "Cart",
    cartItemSchema
  );