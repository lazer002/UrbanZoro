import mongoose from "mongoose";
const { Schema } = mongoose;

const ReturnItemSchema = new Schema({
  orderItemId: { type: String, required: true }, // id of item inside order.items
  productId: { type: String, required: true },

  title: { type: String, default: "" },
  variant: { type: String, default: "" },

  orderedQty: { type: Number, required: true, default: 1 },
  qty: { type: Number, required: true, default: 1 }, // qty being returned
  price: { type: Number, default: 0 },

  action: { type: String, enum: ["refund", "exchange", "repair"], default: "refund" },
  reason: { type: String, default: "" },

  // per-item details (notes about the defect/issue)
  details: { type: String, default: "" },

  // per-item photos (array of URLs)
  photos: [{ type: String }],
   exchangeSize: { type: String, default: null }
}, { _id: false });

const StatusEntry = new Schema({
  from: { type: String },
  to: { type: String, required: true },          // required per your validator
  by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  note: { type: String, default: "" },
  at: { type: Date, default: Date.now }
}, { _id: false });

const ReturnRequestSchema = new Schema({
  rmaNumber: { type: String, required: true, unique: true, index: true }, // e.g. RMA-20251119-1234

  orderId: { type: String, required: true, index: true }, // order._id
  orderNumber: { type: String, default: null, index: true },

  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  guestId: { type: String, default: null },
  guestEmail: { type: String, default: null },

  status: {
    type: String,
    enum: [
      "submitted",
      "awaiting_shipment",
      "received",
      "inspecting",
      "approved",
      "rejected",
      "refunded",
      "completed",
      "cancelled"
    ],
    default: "submitted",
    index: true
  },

  // ITEMS: everything lives inside items (photos/details inside each item)
  items: { type: [ReturnItemSchema], required: true },

  // status history (keeps track of changes)
  statusHistory: { type: [StatusEntry], default: [] },

}, { timestamps: true });

// auto-generate RMA if missing
ReturnRequestSchema.pre("validate", function(next){
  if (!this.rmaNumber) {
    const d = new Date();
    const prefix = `RMA-${d.toISOString().slice(0,10).replace(/-/g,"")}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    this.rmaNumber = `${prefix}-${random}`;
  }
  next();
});

export const Return = mongoose.model("ReturnRequest", ReturnRequestSchema);
