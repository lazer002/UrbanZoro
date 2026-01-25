import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "GuestUser", required: false },

    // required & validated
    email: { type: String, required: true, match: /.+\@.+\..+/, index: true },
    orderNumber: { type: String, unique: true, required: true, index: true },

    shippingMethod: { type: String, default: "free" },
    billingSame: { type: Boolean, default: true },

    items: {
      type: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "Bundle", default: null },
          title: { type: String, required: true },
          variant: { type: String, default: "" },
          quantity: { type: Number, required: true },
          price: { type: Number, required: true },
          total: { type: Number, required: true },
          mainImage: { type: String, required: true },
          bundleProducts: {
            type: [
              {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
                title: String,
                variant: String,
                quantity: Number,
                price: Number,
                mainImage: { type: String, required: true },
              },
            ],
            default: [],
          },
        },
      ],
      validate: [(v) => Array.isArray(v) && v.length > 0, "Order must have at least one item"],
    },

    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 100 },
    total: { type: Number, required: true },
    discountCode: { type: String, default: "" },

    paymentMethod: { type: String, enum: ["cod", "razorpay"], required: true },
    paymentStatus: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    orderStatus: {
      type: String,
      enum: [ "pending","confirmed","dispatched","shipped","out for delivery","delivered","cancelled","refunded"],
      default: "pending",
    },

    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: [ "pending","confirmed","dispatched","shipped","out for delivery","delivered","cancelled","refunded"],
            required: true,
          },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    shippingAddress: {
      firstName: String,
      lastName: String,
      address: String,
      apartment: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      phone: String,
    },

    trackingId: { type: String },
    fulfillmentStatus: {
      type: String,
      enum: ["unfulfilled", "fulfilled", "returned", "cancelled"],
      default: "unfulfilled",
    },

    fulfillmentDetails: {
      trackingNumber: { type: String },
      carrier: { type: String },
      fulfilledAt: { type: Date },
      fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      notes: { type: String },
    },
    estimatedDelivery: { type: Date },
    orderNotes: { type: String },
    couponDiscount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    cancelReason: { type: String },
    cancelReasonDetails: { type: String },
    source: { type: String, enum: ["web", "mobile", "admin"], default: "web" },
   invoiceNumber: {
  type: String,
  unique: true,
  sparse: true, // allows null for orders without invoices yet
}
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


// Inside OrderSchema
OrderSchema.pre("save", function (next) {
  // Add initial status only on first save
  if (this.isNew) {
    // Ensure no duplicate 'pending' entries
    if (!this.statusHistory || this.statusHistory.length === 0) {
      this.statusHistory = [{ status: this.orderStatus || "pending" }];
    }
  }
  next();
});

OrderSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (!update) return next();
  const newStatus =
    update.orderStatus || (update.$set && update.$set.orderStatus);

  if (newStatus) {
    const now = new Date();
    if (!update.$push) update.$push = {};
    update.$push.statusHistory = { status: newStatus, updatedAt: now };

    if (!update.$set) update.$set = {};
    update.$set.orderStatus = newStatus;

    delete update.orderStatus;
  }

  next();
});



OrderSchema.index({ guestId: 1 });
OrderSchema.index({ createdAt: -1 });

// Nice response shape: remove __v and convert _id -> id
OrderSchema.method("toJSON", function () {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
});

// Optional virtuals
OrderSchema.virtual("itemCount").get(function () {
  if (!this.items) return 0;
  return this.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
});

export const Order = mongoose.model("Order", OrderSchema);
