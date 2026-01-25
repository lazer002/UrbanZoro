// backend/src/routes/returns.js
import express from "express";
import mongoose from "mongoose";
import { Return } from "../models/Return.js";
import { Order } from "../models/Order.js"; // adjust path to your Order model
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router();

// Helper: find order by _id or orderNumber
async function findOrderByIdOrNumber(idOrNumber) {
  if (!idOrNumber) return null;

  // try ObjectId first
  if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
    const byId = await Order.findById(idOrNumber).lean();
    if (byId) return byId;
  }

  // fallback: find by orderNumber
  const byNumber = await Order.findOne({ orderNumber: idOrNumber }).lean();
  return byNumber;
}

router.post("/", async (req, res) => {
  try {
    console.log("Received return request:", req.body);
    const actor = req.user?._id || null; // if you have auth middleware

    const {
      orderId,
      orderNumber,
      guestEmail,
      items,
    } = req.body;

    // Basic guard
    if (!orderId && !orderNumber) {
      return res.status(400).json({ success: false, message: "orderId or orderNumber is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "items array is required" });
    }

    // Try fetch order (optional but helpful)
    const order = await findOrderByIdOrNumber(orderId || orderNumber);

    // Normalize & validate items, fill productId from order when missing
    const normalizedItems = [];

    for (const it of items) {
      if (!it || typeof it !== "object") {
        return res.status(400).json({ success: false, message: "each item must be an object" });
      }

      const { orderItemId, productId, qty = 1 } = it;
      if (!orderItemId) {
        return res.status(400).json({ success: false, message: "orderItemId required for each item" });
      }

      let finalProductId = productId || null;

      // If productId missing, try to fill from order items
      if (!finalProductId && order && Array.isArray(order.items)) {
        const match = order.items.find((oi) => {
          // support ObjectId or plain id/sku
          const oid = oi._id ? String(oi._id) : (oi.id || oi.sku);
          return oid && String(oid) === String(orderItemId);
        });
        if (match && (match.productId || match.productId === 0)) finalProductId = match.productId;
      }

      if (!finalProductId) {
        return res.status(400).json({
          success: false,
          message: `Missing productId for orderItemId ${orderItemId}. Provide productId or ensure the order has a matching item with productId.`,
        });
      }

      normalizedItems.push({
        orderItemId: String(orderItemId),
        productId: String(finalProductId),
        title: it.title || "",
        variant: it.variant || "",
        orderedQty: it.orderedQty || it.qty || 1,
        qty: Number(qty) || 1,
        price: Number(it.price || it.unitPrice || 0),
        action: it.action || "refund",
        reason: it.reason || "",
        // per-item details and photos (frontend must send these per-item)
        details: it.details || "",
        photos: Array.isArray(it.photos) ? it.photos.filter(Boolean) : [],
        exchangeSize: it.exchangeSize || null,

      });
    }

    // initial status entry (schema requires `to`)
    const initialStatus = {
      from: null,
      to: "submitted", // match schema default / enum
      by: actor,
      note: "Return request submitted",
      at: new Date(),
    };

    // Compose document according to new schema (no global details/photos/notes)
    const doc = new Return({
      orderId: String(orderId || (order && order._id) || ""),
      orderNumber: orderNumber || (order && order.orderNumber) || null,
      guestEmail: guestEmail || (order && order.email) || null,
      userId: req.user?._id || null,
      guestId: order && order.guestId ? order.guestId : null,
      items: normalizedItems,
      statusHistory: [initialStatus],
      status: initialStatus.to || "submitted",
    });

    // Save
    const saved = await doc.save();

    return res.status(201).json({ success: true, message: "Return request created", rma: saved });
  } catch (err) {
    console.error("POST /returns error:", err);

    if (err && err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "ReturnRequest validation failed", errors: err.errors });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
});



router.get("/order/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    const query = { orderNumber: String(orderNumber) };
    if (email) query.guestEmail = String(email).toLowerCase();

    const ret = await Return.findOne(query).sort({ createdAt: -1 }).lean();

    if (!ret) return res.status(404).json({ message: "No return found" });

    return res.json(ret);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});
router.get("/", async (req, res) => {
  try {
    const { orderNumber, rmaNumber, limit = 20 } = req.query;

    const q = {};
    if (orderNumber) q.orderNumber = String(orderNumber);
    if (rmaNumber) q.rmaNumber = String(rmaNumber);

    let query = Return.find(q).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 20, 100));

    const returns = await query.lean();

    return res.json(returns);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:rmaNumber", async (req, res) => {
  try {
    console.log("Fetching return request for RMA:", req.params.rmaNumber);
    console.log("Authenticated user:", req.user);
    const { rmaNumber } = req.params;

    if (!rmaNumber) {
      return res.status(400).json({
        success: false,
        message: "RMA number is required",
      });
    }

    // Find by rmaNumber
    const returnReq = await Return.findOne({ rmaNumber }).lean();

    if (!returnReq) {
      return res.status(404).json({
        success: false,
        message: `Return request not found for RMA ${rmaNumber}`,
      });
    }

    return res.json({
      success: true,
      returnRequest: returnReq,
    });
  } catch (error) {
    console.error("GET /returns/:rmaNumber error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
// UPDATE RETURN STATUS + NOTE (ADMIN ONLY)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "" } = req.body;

    // Validate status
    const allowed = [
      "submitted",
      "awaiting_shipment",
      "received",
      "inspecting",
      "approved",
      "refunded",
      "completed",
      "rejected",
      "cancelled",
    ];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}`,
      });
    }

    // Find return request
    const ret = await Return.findById(id);
    if (!ret) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    const prevStatus = ret.status;

    // Apply update
    ret.status = status;
    ret.statusHistory.push({
      from: prevStatus,
      to: status,
      by: req.user?._id || null,
      note,
      at: new Date(),
    });

    const saved = await ret.save();

    return res.json({
      success: true,
      message: "Status updated",
      rma: saved,
    });
  } catch (error) {
    console.error("PATCH /returns/:id/status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating status",
    });
  }
});


export default router;
