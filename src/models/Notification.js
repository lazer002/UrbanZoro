import mongoose from "mongoose";

const { Schema } = mongoose;

/* =======================================================
   PAYLOAD
======================================================= */

const PayloadSchema = new Schema(
  {
    orderId: {
      type: String,
      default: null,
    },

    orderNumber: {
      type: String,
      default: null,
    },

    returnId: {
      type: String,
      default: null,
    },

    rmaNumber: {
      type: String,
      default: null,
    },

    productId: {
      type: String,
      default: null,
    },

    action: {
      type: String,
      default: null,
    },

    screen: {
      type: String,
      default: null,
    },

    params: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  }
);

/* =======================================================
   MAIN NOTIFICATION SCHEMA
======================================================= */

const NotificationSchema = new Schema(
  {
    /* =====================================================
       TYPE
    ===================================================== */

    type: {
      type: String,

      enum: [
        "order",
        "shipping",
        "return",
        "offer",
        "payment",
        "account",
        "system",
        "update",
      ],

      required: true,

      index: true,
    },

    /* =====================================================
       CONTENT
    ===================================================== */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    /* =====================================================
       TARGET
    ===================================================== */

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

    /* =====================================================
       READ STATUS
    ===================================================== */

    read: {
      type: Boolean,

      default: false,

      index: true,
    },

    readAt: {
      type: Date,

      default: null,
    },

    /* =====================================================
       PUSH DELIVERY
    ===================================================== */

    push: {
      enabled: {
        type: Boolean,

        default: true,
      },

      sent: {
        type: Boolean,

        default: false,

        index: true,
      },

      sentAt: {
        type: Date,

        default: null,
      },

      failed: {
        type: Boolean,

        default: false,
      },

      failedAt: {
        type: Date,

        default: null,
      },

      error: {
        type: String,

        default: null,
      },

      attempts: {
        type: Number,

        default: 0,
      },
    },

    /* =====================================================
       PRIORITY
    ===================================================== */

    priority: {
      type: String,

      enum: [
        "low",
        "normal",
        "high",
        "urgent",
      ],

      default: "normal",

      index: true,
    },

    /* =====================================================
       EXTRA DATA
    ===================================================== */

    payload: {
      type: PayloadSchema,

      default: () => ({}),
    },

    /* =====================================================
       EXPIRATION
    ===================================================== */

    expiresAt: {
      type: Date,

      default: null,

      index: true,
    },
  },

  {
    timestamps: true,
  }
);

/* =======================================================
   PERFORMANCE INDEXES
======================================================= */

NotificationSchema.index({
  userId: 1,
  createdAt: -1,
});

NotificationSchema.index({
  guestId: 1,
  createdAt: -1,
});

NotificationSchema.index({
  userId: 1,
  read: 1,
  createdAt: -1,
});

NotificationSchema.index({
  guestId: 1,
  read: 1,
  createdAt: -1,
});

NotificationSchema.index({
  userId: 1,
  type: 1,
  createdAt: -1,
});

NotificationSchema.index({
  priority: 1,
  "push.sent": 1,
  createdAt: -1,
});

NotificationSchema.index({
  expiresAt: 1,
});

/* =======================================================
   VALIDATION
======================================================= */

NotificationSchema.pre(
  "validate",
  function (next) {
    if (!this.userId && !this.guestId) {
      return next(
        new Error(
          "Notification requires userId or guestId"
        )
      );
    }

    next();
  }
);

/* =======================================================
   EXPORT
======================================================= */

export const Notification =
  mongoose.models.Notification ||
  mongoose.model(
    "Notification",
    NotificationSchema
  );