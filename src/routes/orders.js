// routes/checkout.js
import express from "express";
import { Order } from "../models/Order.js";
import { GuestUser } from "../models/GuestUser.js";
import { Payment } from "../models/Payment.js";
import axios from "axios"; // fixed import
import { getNextOrderSeq } from "../models/Counter.js";
import { sendEmail } from "../utils/sendEmail.js";
import { templateForStatus } from "../utils/emailTemplates.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


router.post("/create", requireAuth, async (req, res) => {
  try {
    console.log("Create order request body:", req.body);
    // defensive read: prefer normalized id set by requireAuth
    const userId = req.user?.id || req.user?._id || null;
    console.log("Resolved userId:", userId);

    const {
      items,
      subtotal,
      shipping,
      total,
      shippingMethod,
      billingSame,
      shippingAddress,
      contactEmail,
      paymentMethod,
      discountCode,
      source,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    let guestId = null;

    // Only create guest if there's no logged-in user
    if (!userId) {
      // find or create guest by email to avoid duplicates
      let guest = null;
      if (contactEmail) {
        guest = await GuestUser.findOne({ email: contactEmail });
      }
      if (!guest) {
        guest = await GuestUser.create({
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
      guestId = guest._id;
    }

    const orderItems = items.map((i) => ({
      productId: i.productId || null,
      bundleId: i.bundleId || null,
      title: i.title,
      variant: i.variant || "",
      quantity: i.quantity,
      price: i.price,
      total: i.total || i.quantity * i.price,
      bundleProducts: i.bundleProducts || [],
      mainImage: i.mainImage || "",
    }));

    const nextSeq = await getNextOrderSeq(new Date().getFullYear());
    const orderNumber = `DD-${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;

    const order = await Order.create({
      userId: userId || null,           // <-- IMPORTANT: save userId when logged-in
      guestId: userId ? null : guestId, // clear guestId for logged-in users
      email: userId ? (req.user.email || contactEmail) : contactEmail,
      orderNumber,
      shippingMethod,
      billingSame,
      shippingAddress,
      items: orderItems,
      subtotal,
      shippingFee: shipping || 100,
      total,
      discountCode: discountCode || "",
      paymentMethod,
      source,
      paymentStatus: paymentMethod === "cod" ? "pending" : "initiated",
      orderStatus: "pending",
    });

    if (!userId && guestId) {
      await GuestUser.findByIdAndUpdate(guestId, { $push: { orders: order._id } });
    }

    // Razorpay flow (unchanged)
    if (paymentMethod === "razorpay") {
      const razorpayOptions = {
        amount: total * 100,
        currency: "INR",
        receipt: order._id.toString(),
      };

      const razorpayAuth = {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_SECRET,
        },
      };

      const razorpayOrder = await axios.post("https://api.razorpay.com/v1/orders", razorpayOptions, razorpayAuth);

      await Payment.create({
        orderId: order._id,
        razorpayOrderId: razorpayOrder.data.id,
        amount: total,
        currency: "INR",
        status: "pending",
      });

      order.razorpayOrderId = razorpayOrder.data.id;
      await order.save();

      return res.json({
        success: true,
        orderNumber,
        orderId: order._id,
        amount: total,
        currency: "INR",
        razorpayOrderId: razorpayOrder.data.id,
      });
    }

    // send email (unchanged)
    try {
      const { subject, text, html } = templateForStatus("placed", { order });
      await sendEmail({ to: order.email, subject, text, html });
    } catch (err) {
      console.error("Error sending order email:", err.message);
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


// Razorpay payment success webhook
router.post("/payment-success", async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "success";
    await payment.save();

    const order = await Order.findById(payment.orderId);
    order.payment.status = "success";
    order.payment.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    res.json({ success: true, message: "Payment recorded successfully" });
  } catch (err) {
    console.error("Payment success error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});





router.get("/track", async (req, res) => {
  try {
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

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders for user ${userId}`);
    res.json({ orders });
  } catch (err) {
    console.error("Get user orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});


export default router;
