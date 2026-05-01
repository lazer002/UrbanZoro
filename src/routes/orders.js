// routes/checkout.js
import express from "express";
import { Order } from "../models/Order.js";
import { GuestUser } from "../models/GuestUser.js";
import { Payment } from "../models/Payment.js";
import axios from "axios"; // fixed import
import { getNextOrderSeq } from "../models/Counter.js";
import { sendEmail } from "../utils/sendEmail.js";
import { templateForStatus } from "../utils/emailTemplates.js";
import { requireAuth ,optionalAuth} from "../middleware/auth.js";
import {Product} from "../models/Product.js";
import mongoose from "mongoose";
import crypto from "crypto";
const router = express.Router();


router.post("/create", optionalAuth, async (req, res) => {
  try {
    console.log("Create order request body:", req.body);

    const userId = req.user?.id || req.user?._id || null;

    const {
      items,
      shippingMethod,
      billingSame,
      shippingAddress,
      contactEmail,
      paymentMethod,
      discountCode,
      source,
    } = req.body;

    // ✅ Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    // ✅ Validate payment method
    if (!["cod", "razorpay"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // =========================
    // 🔐 SECURE PRICE CALCULATION
    // =========================

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({ error: "Invalid product" });
      }

      const itemTotal = product.price * item.quantity;

      calculatedSubtotal += itemTotal;

      validatedItems.push({
        productId: product._id,
        title: product.title,
        quantity: item.quantity,
        price: product.price, // ✅ trusted from DB
        total: itemTotal,
       mainImage: product.images?.[0] || "default.jpg",
      });
    }

    const shippingFee = 100; // you can make dynamic later
    const finalTotal = calculatedSubtotal + shippingFee;

    // =========================
    // 👤 Guest Handling (unchanged)
    // =========================

    let guestId = null;

    if (!userId) {
      const clientGuestId = req.headers["x-guest-id"];
      guestId = clientGuestId;

      let guest = null;

      if (contactEmail) {
        guest = await GuestUser.findOne({ email: contactEmail });
      }

      if (!guest) {
        guest = await GuestUser.create({
          guestId,
          email: contactEmail,
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address,
          apartment: shippingAddress.apartment || "",
          city: shippingAddress.city,
          state: shippingAddress.state || "Delhi",
          zip: shippingAddress.zip || "110045",
          country: shippingAddress.country || "India",
          phone: shippingAddress.phone,
        });
      }
    }

    // =========================
    // 📦 Create Order
    // =========================

    const nextSeq = await getNextOrderSeq(new Date().getFullYear());
    const orderNumber = `DD-${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;

    const order = await Order.create({
      userId: userId || null,
      guestId: userId ? null : guestId,
      email: userId ? (req.user.email || contactEmail) : contactEmail,
      orderNumber,
      shippingMethod,
      billingSame,
      shippingAddress,
      items: validatedItems, // ✅ secure items
      subtotal: calculatedSubtotal,
      shippingFee,
      total: finalTotal,
      discountCode: discountCode || "",
      paymentMethod,
      source,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    // =========================
    // 👤 Guest order linking
    // =========================

    if (!userId) {
      await GuestUser.findOneAndUpdate(
        { email: contactEmail },
        {
          $push: { orders: order._id },
        },
        { upsert: true }
      );
    }

    // =========================
    // 💳 Razorpay Integration
    // =========================

    if (paymentMethod === "razorpay") {
      const razorpayOptions = {
        amount: finalTotal * 100, // 🔥 IMPORTANT (paise)
        currency: "INR",
        receipt: order._id.toString(),
      };

      const razorpayAuth = {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_SECRET,
        },
      };

      const razorpayOrder = await axios.post(
        "https://api.razorpay.com/v1/orders",
        razorpayOptions,
        razorpayAuth
      );

      await Payment.create({
        orderId: order._id,
        razorpayOrderId: razorpayOrder.data.id,
        amount: finalTotal,
        currency: "INR",
        status: "pending",
         method: "razorpay",
      });

      order.razorpayOrderId = razorpayOrder.data.id;
      await order.save();

      return res.json({
        success: true,
        orderNumber,
        orderId: order._id,
        amount: finalTotal, // frontend will use this
        currency: "INR",
        razorpayOrderId: razorpayOrder.data.id,
      });
    }

    // =========================
    // 📩 COD Email
    // =========================

    try {
      const { subject, text, html } = templateForStatus("placed", { order });
      await sendEmail({ to: order.email, subject, text, html });
    } catch (err) {
      console.error("Email error:", err.message);
    }

    res.json({
      success: true,
      orderNumber,
      orderId: order._id,
      message: "Order placed successfully (COD)",
    });

  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});




router.post("/payment-success", async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // =========================
    // 🔐 1. VERIFY SIGNATURE
    // =========================

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
      });
    }

    // =========================
    // 📦 2. FIND ORDER
    // =========================

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // =========================
    // 🔁 3. PREVENT DOUBLE PAYMENT
    // =========================

    if (order.paymentStatus === "paid") {
      return res.json({ success: true, message: "Already paid" });
    }

    // =========================
    // 💳 4. UPDATE PAYMENT
    // =========================

    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: "paid",
      }
    );

    // =========================
    // ✅ 5. UPDATE ORDER
    // =========================

    order.paymentStatus = "success";
    order.orderStatus = "confirmed";
    await order.save();

    // =========================
    // 📩 6. OPTIONAL: SEND EMAIL
    // =========================
    try {
      const { subject, text, html } = templateForStatus("paid", { order });
      await sendEmail({ to: order.email, subject, text, html });
    } catch (err) {
      console.error("Email error:", err.message);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
    });

  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});





router.get("/track", async (req, res) => {
  try {
    console.log("Track order query:", req.query);
    const { email, orderNumber } = req.query;
    if (!email && !orderNumber) {
      return res.status(400).json({ success: false, message: "email or orderNumber required" });
    }

    // prefer exact match by both if provided
    const query = {};
    if (email) query.email = email;
    if (orderNumber) query.orderNumber = orderNumber;

    // if only email provided, return the most recent order for that email
    const order = await Order.findOne(query).sort({ createdAt: -1 }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Track order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/track-email", async (req, res) => {
  try {
    const { email, orderNumber, orderId } = req.body;
    if (!email || !orderNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Email and order number are required." });
    }

    // ✅ Find order to confirm existence (optional, but nice to have)
    const order = await Order.findOne({
      _id: orderId,
      email,
      orderNumber,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No matching order found for this email and order number.",
      });
    }

    // ✅ Build tracking link
    const origin = process.env.FRONTEND_URL || "https://yourfrontend.example";
    const trackLink = `${origin}/track-order?email=${encodeURIComponent(
      email
    )}&orderNumber=${encodeURIComponent(orderNumber)}`;

    // ✅ Email content
    const subject = `Track Your Order — ${orderNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #eee; border-radius:10px; padding:24px;">
        <h2 style="text-align:center; color:#000; margin-bottom:20px;">🖤 Your DripDesi Order</h2>
        <p style="font-size:15px; color:#333;">Hi ${order.shippingAddress?.firstName || "there"},</p>
        <p style="font-size:14px; color:#555;">
          You can track your order <strong>${orderNumber}</strong> anytime using the button below.
        </p>

        <div style="text-align:center; margin:28px 0;">
          <a href="${trackLink}"
            style="display:inline-block; background:#000; color:#fff; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:600;">
            Track My Order
          </a>
        </div>

        <p style="font-size:13px; color:#777;">
          If the button doesn’t work, you can copy and paste this link into your browser:<br/>
          <a href="${trackLink}" style="color:#000;">${trackLink}</a>
        </p>

        <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
        <p style="font-size:12px; color:#999; text-align:center;">
          Thank you for shopping with <strong>DripDesi</strong>.<br/>
          We’ll notify you once your items are shipped.
        </p>
      </div>
    `;

    // ✅ Send the email
    const result = await sendEmail({
      to: email,
      subject,
      html,
    });

    if (!result.success) {
      throw result.error;
    }

    console.log(`📧 Tracking email sent to ${email} for ${orderNumber}`);
    return res.json({
      success: true,
      message: "Tracking email sent successfully.",
    });
  } catch (err) {
    console.error("❌ Email send error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to send tracking email." });
  }
});

router.get("/mine", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestId = req.headers["x-guest-id"];


    let orders = [];

    if (userId) {
      orders = await Order.find({ userId });
    } else if (guestId) {
      orders = await Order.find({ guestId });
    } else {
      return res.status(400).json({ error: "No identity" });
    }

    res.json({
      orders: orders.sort((a, b) => b.createdAt - a.createdAt),
    });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
router.post("/merge-orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const guestId = req.headers["x-guest-id"];

    console.log("🔄 MERGING guestId:", guestId, "→ user:", userId);

    if (!guestId) {
      return res.json({ message: "No guest orders" });
    }

    const result = await Order.updateMany(
      { guestId }, // ✅ THIS IS KEY
      {
        $set: { userId },
        $unset: { guestId: "" },
      }
    );

    console.log("✅ Orders merged:", result.modifiedCount);

    res.json({ success: true, merged: result.modifiedCount });
  } catch (err) {
    console.error("❌ Merge failed:", err);
    res.status(500).json({ error: "Merge failed" });
  }
});

router.put("/cancel", async (req, res) => {
  try {
    const { orderId } = req.body;
    const guestId = req.headers["x-guest-id"];
    const userId = req.user?.id || null;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    /* 🔒 SECURITY */
    if (userId) {
      if (order.userId?.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    } else {
      if (order.guestId !== guestId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    /* 🚫 VALIDATION */
    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      return res.status(400).json({
        error: "Order cannot be cancelled now",
      });
    }

    // ✅ USE THIS INSTEAD OF save()
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: "cancelled" }, // middleware will handle history
      { new: true }
    );

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });

  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Cancel failed" });
  }
});
export default router;
