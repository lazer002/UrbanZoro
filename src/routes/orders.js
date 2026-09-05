// routes/checkout.js
import express from "express";
import { Order } from "../models/Order.js";
import { GuestUser } from "../models/GuestUser.js";
import { Payment } from "../models/Payment.js";
import axios from "axios"; // fixed import
import { getNextOrderSeq } from "../models/Counter.js";
import { sendOrderEmail  } from "../utils/sendEmail.js";
import { requireAuth ,optionalAuth} from "../middleware/auth.js";
import {Product} from "../models/Product.js";
import { Bundle } from "../models/Bundle.js";
import {
  updateOrderInventory,
} from "../utils/inventoryUpdate.js";
import { Inventory } from "../models/Inventory.js";
import crypto from "crypto";
const router = express.Router();




router.post("/create", optionalAuth, async (req, res) => {
  try {
    console.log("Create order request body:", JSON.stringify(req.body.items));
    // return

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



    let calculatedSubtotal = 0;
    const validatedItems = [];
for (const item of items) {
  // =========================
  // 📦 NORMAL BUNDLE
  // =========================

  if (item.bundleId) {
    const bundle = await Bundle.findOne({
      publicId: item.bundleId
    });

    if (!bundle) {
      return res.status(400).json({
        error: "Invalid bundle",
      });
    }

    const bundleQuantity =
      Number(item.quantity) || 1;

    const itemTotal =
      bundle.price * bundleQuantity;

    calculatedSubtotal += itemTotal;

    const bundleProductsValidated = [];

    for (const bp of item.bundleProducts || []) {
      const product = await Product.findOne({
        publicId: bp.productId,
      });

      if (!product) {
        return res.status(400).json({
          error: "Invalid bundle product",
        });
      }

      const variant = String(
        bp.variant || ""
      ).trim();

      const quantity =
        Number(bp.quantity) || 1;

      const requiredStock =
        quantity * bundleQuantity;

      if (!variant) {
        return res.status(400).json({
          error: `${product.title}: size is required`,
        });
      }

      const inventory =
        await Inventory.findOne({
          product: product._id,
          active: true,
        });

      if (!inventory) {
        return res.status(400).json({
          error: `Inventory not found for ${product.title}`,
        });
      }

      const availableStock =
        inventory.stock instanceof Map
          ? Number(
              inventory.stock.get(variant) || 0
            )
          : Number(
              inventory.stock?.[variant] || 0
            );

      if (
        inventory.trackInventory &&
        !inventory.allowBackorder &&
        availableStock < requiredStock
      ) {
        return res.status(400).json({
          error: `${product.title} (${variant}) has only ${availableStock} left`,
        });
      }

      bundleProductsValidated.push({
        productId: product._id,
        title: product.title,
        variant,
        quantity,
        price: product.price,
        mainImage:
          product.images?.[0] || "",
      });
    }

    validatedItems.push({
      bundleId: bundle._id,
      customBundle: false,
      title: bundle.title,
      quantity: bundleQuantity,
      price: bundle.price,
      total: itemTotal,
    mainImage:
  item.mainImage &&
  item.mainImage !== "default.jpg"
    ? item.mainImage
    : bundleProductsValidated[0]?.mainImage || "default.jpg",
      bundleProducts:
        bundleProductsValidated,
    });

    continue;
  }

  // =========================
  // 🎁 CUSTOM BUNDLE
  // =========================

  if (item.customBundle) {
    let originalBundlePrice = 0;

    const bundleQuantity =
      Number(item.quantity) || 1;

    const bundleProductsValidated = [];

    if (
      !Array.isArray(item.bundleProducts) ||
      item.bundleProducts.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Custom bundle must contain products",
      });
    }

    for (const bp of item.bundleProducts) {
      const product = await Product.findOne({
        publicId: bp.productId,
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          error: "Invalid bundle product",
        });
      }

      const quantity =
        Number(bp.quantity) || 1;

      const variant = String(
        bp.variant || ""
      ).trim();

      if (!variant) {
        return res.status(400).json({
          success: false,
          error: `${product.title}: size is required`,
        });
      }

      const inventory =
        await Inventory.findOne({
          product: product._id,
          active: true,
        });

      if (!inventory) {
        return res.status(400).json({
          success: false,
          error: `Inventory not found for ${product.title}`,
        });
      }

      const requiredStock =
        quantity * bundleQuantity;

      const availableStock =
        inventory.stock instanceof Map
          ? Number(
              inventory.stock.get(variant) || 0
            )
          : Number(
              inventory.stock?.[variant] || 0
            );

      if (
        inventory.trackInventory &&
        !inventory.allowBackorder &&
        availableStock < requiredStock
      ) {
        return res.status(400).json({
          success: false,
          error: `${product.title} (${variant}) has only ${availableStock} left`,
        });
      }

      originalBundlePrice +=
        Number(product.price || 0) *
        quantity;

      bundleProductsValidated.push({
        productId: product._id,
        title: product.title,
        variant,
        quantity,
        price: product.price,
        mainImage:
          product.images?.[0] || "",
      });
    }

    const discountPercentage = 10;

    const discountAmount =
      originalBundlePrice *
      (discountPercentage / 100);

    const customBundlePrice = Math.round(
      originalBundlePrice -
        discountAmount
    );

    const itemTotal =
      customBundlePrice *
      bundleQuantity;

    calculatedSubtotal += itemTotal;

    validatedItems.push({
      customBundle: true,

      title:
        item.title || "Custom Bundle",

      quantity: bundleQuantity,

      price: customBundlePrice,

      originalPrice:
        originalBundlePrice,

      discountPercentage,

      discountAmount:
        Math.round(discountAmount),

      total: itemTotal,

      mainImage:
        item.mainImage || "",

      bundleProducts:
        bundleProductsValidated,
    });

    continue;
  }

  // =========================
  // 🛍️ NORMAL PRODUCT
  // =========================

const product = await Product.findOne({
  publicId: item.productId,
});

  if (!product) {
    return res.status(400).json({
      error: "Invalid product",
    });
  }

  const variant = String(
    item.variant || ""
  ).trim();

  if (!variant) {
    return res.status(400).json({
      error: `${product.title}: size is required`,
    });
  }

  const quantity =
    Number(item.quantity) || 1;

  if (quantity <= 0) {
    return res.status(400).json({
      error: "Invalid quantity",
    });
  }

  const inventory =
    await Inventory.findOne({
      product: product._id,
      active: true,
    });

  if (!inventory) {
    return res.status(400).json({
      error: `Inventory not found for ${product.title}`,
    });
  }

  const availableStock =
    inventory.stock instanceof Map
      ? Number(
          inventory.stock.get(variant) || 0
        )
      : Number(
          inventory.stock?.[variant] || 0
        );

  if (
    inventory.trackInventory &&
    !inventory.allowBackorder &&
    availableStock < quantity
  ) {
    return res.status(400).json({
      error: `${product.title} (${variant}) has only ${availableStock} left`,
    });
  }

  const itemTotal =
    Number(product.price || 0) *
    quantity;

  calculatedSubtotal += itemTotal;

  validatedItems.push({
    productId: product._id,
    title: product.title,
    quantity,
    price: product.price,
    total: itemTotal,
    variant,
    mainImage:
      product.images?.[0] ||
      "default.jpg",
  });
}
    const shippingFee = 0; // you can make dynamic later
    const finalTotal = calculatedSubtotal + shippingFee;

    // =========================
    // 👤 Guest Handling (unchanged)
    // =========================

let guestId = null;

if (!userId) {
  const clientGuestId = req.headers["x-guest-id"];
  console.log("Guest checkout with guestId:", clientGuestId);

  // ✅ FIX: assign to outer variable
  guestId =
    clientGuestId && clientGuestId !== "null"
      ? clientGuestId
      : crypto.randomUUID();

  let guest = await GuestUser.findOne({ guestId });

  if (!guest) {
    guest = await GuestUser.create({
      guestId,
      email: contactEmail,
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      address: shippingAddress.address,
      apartment: shippingAddress.apartment || "",
      city: shippingAddress.city,
      state: shippingAddress.state || "none",
      zip: shippingAddress.zip || "none",
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
    const initialOrderStatus = paymentMethod === "cod" ? "confirmed" : "pending";

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
      orderStatus: initialOrderStatus,
    });

    if (paymentMethod === "cod") {
 await updateOrderInventory(order, "decrease");
}



    // =========================
    // 👤 Guest order linking
    // =========================

    if (!userId) {
      await GuestUser.findOneAndUpdate(
        {guestId  },
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
  publicOrderId: order.publicOrderId,
  orderId: order._id,
  amount: finalTotal,
  currency: "INR",
  razorpayOrderId: razorpayOrder.data.id,
});
    }

    // =========================
    // 📩 COD Email
    // =========================


await sendOrderEmail({
  status: "confirmed",
  order,
});

res.json({
  success: true,
  orderNumber,
  publicOrderId: order.publicOrderId,
  orderId: order._id,
  message: "Order placed successfully (COD)",
});

  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // =========================
    // 🔐 VERIFY WEBHOOK SIGNATURE
    // =========================

    const rawBody = req.body.toString();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.log("❌ Invalid webhook signature");
      return res.sendStatus(400);
    }

    const event = JSON.parse(rawBody);

    // =========================
    // 💰 PAYMENT SUCCESS
    // =========================

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      // =========================
      // 🔗 FIND PAYMENT
      // =========================

      const paymentDoc = await Payment.findOne({
        razorpayOrderId: payment.order_id,
      });

      if (!paymentDoc) {
        console.log("⚠️ Payment document not found");
        return res.sendStatus(200);
      }

      // =========================
      // 📦 FIND ORDER
      // =========================

      const order = await Order.findById(paymentDoc.orderId);

      if (!order) {
        console.log("⚠️ Order not found");
        return res.sendStatus(200);
      }

      // =========================
      // 💰 VERIFY AMOUNT + CURRENCY
      // =========================

      if (
        payment.amount !== order.total * 100 ||
        payment.currency !== "INR"
      ) {
        console.log("❌ Amount mismatch in webhook");
        return res.sendStatus(200);
      }

      // =========================
      // 🔗 VERIFY RAZORPAY ORDER ID
      // =========================

      if (payment.order_id !== paymentDoc.razorpayOrderId) {
        console.log("❌ Razorpay order mismatch");
        return res.sendStatus(200);
      }

      // =========================
      // 🔒 ATOMIC PAYMENT CLAIM
      // =========================
      //
      // Only ONE webhook request can change
      // payment status from pending → paid.
      //
      // If another webhook already changed it,
      // findOneAndUpdate() returns null.
      //

      const claimedPayment = await Payment.findOneAndUpdate(
        {
          _id: paymentDoc._id,
          status: { $ne: "paid" },
        },
        {
          $set: {
            status: "paid",
            razorpayPaymentId: payment.id,
            razorpaySignature: signature,
          },
        },
        {
          new: true,
        }
      );

      // =========================
      // 🚫 ALREADY PROCESSED
      // =========================

      if (!claimedPayment) {
        console.log("ℹ️ Payment already processed");
        return res.sendStatus(200);
      }

      // =========================
      // ✅ UPDATE ORDER
      // =========================

      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";

      await order.save();

      // =========================
      // 📦 DECREASE INVENTORY
      // =========================

      await updateOrderInventory(order, "decrease");

      // =========================
      // 📧 SEND CONFIRMATION EMAIL
      // =========================

      await sendOrderEmail({
        status: "confirmed",
        order,
      });

      console.log(
        `✅ Webhook: Payment captured and order confirmed: ${order.orderNumber}`
      );
    }

    // =========================
    // ❌ PAYMENT FAILED
    // =========================

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      const paymentDoc = await Payment.findOne({
        razorpayOrderId: payment.order_id,
      });

      if (paymentDoc && paymentDoc.status !== "paid") {
        paymentDoc.status = "failed";

        await paymentDoc.save();
      }

      console.log("❌ Webhook: Payment failed");
    }

    // =========================
    // ✅ ALWAYS RETURN 200
    // =========================

    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.sendStatus(500);
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



if (order.razorpayOrderId !== razorpay_order_id) {
  return res.status(400).json({
    success: false,
    error: "Razorpay order mismatch",
  });
}

    // =========================
    // 🔁 3. PREVENT DOUBLE PROCESS
    // =========================

    if (order.paymentStatus === "paid") {
      return res.json({ success: true, message: "Already processed" });
    }

    // =========================
    // 🔗 4. VERIFY ORDER ↔ PAYMENT LINK
    // =========================

    const paymentDoc = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!paymentDoc || paymentDoc.orderId.toString() !== orderId) {
      return res.status(400).json({
        success: false,
        error: "Order mismatch",
      });
    }


    
    // =========================
    // 💰 5. VERIFY WITH RAZORPAY API
    // =========================

    const razorpayRes = await axios.get(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_SECRET,
        },
      }
    );

    const paymentData = razorpayRes.data;

if (paymentData.status !== "captured") {
  paymentDoc.status = "failed";
  await paymentDoc.save();

  return res.status(400).json({
    success: false,
    error: "Payment not captured",
  });
}
    if (
      paymentData.amount !== order.total * 100 ||
      paymentData.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        error: "Amount mismatch",
      });
    }

// =========================
// ✅ 6. VERIFICATION ONLY
// =========================
// Do NOT mark payment/order as paid here.
// Webhook is responsible for final processing.

return res.json({
  success: true,
  message: "Payment verified successfully. Awaiting webhook confirmation.",
});

  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



router.get("/track", optionalAuth, async (req, res) => {
  try {
    console.log("Track order query:", req.query);

    const { email, orderNumber } = req.query;
    const userId = req.user?.id || null;
    const guestId = req.headers["x-guest-id"];

    // =========================
    // 🔍 BASIC VALIDATION
    // =========================

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    let order;

    // =========================
    // 👤 LOGGED-IN USER
    // =========================

    if (userId) {
      order = await Order.findOne({
        orderNumber,
        userId,
      }).lean();
    }

    // =========================
    // 👤 GUEST USER
    // =========================

    else {
      if (!email || !guestId) {
        return res.status(400).json({
          success: false,
          message: "Email, order number and guest ID are required",
        });
      }

      order = await Order.findOne({
        orderNumber,
        email,
        guestId,
      }).lean();
    }

    // =========================
    // ❌ NOT FOUND
    // =========================

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // =========================
    // ✅ RESPONSE
    // =========================

    return res.json({
      success: true,
      order,
    });

  } catch (err) {
    console.error("Track order error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/track-email",optionalAuth, async (req, res) => {
  try {
    const { email, orderNumber } = req.body;

    if (!email || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Email and order number are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOrderNumber = orderNumber.trim();

    const order = await Order.findOne({
      email: normalizedEmail,
      orderNumber: normalizedOrderNumber,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "No matching order found for this email and order number.",
      });
    }

    const origin = process.env.CLIENT_ORIGIN_WEB;

    if (!origin) {
      throw new Error("CLIENT_ORIGIN_WEB is not configured");
    }

    const trackLink =
      `${origin}/trackorder` +
      `?email=${encodeURIComponent(order.email)}` +
      `&orderNumber=${encodeURIComponent(order.orderNumber)}`;

    const result = await sendOrderEmail({
      status: "tracking",
      order,
      trackLink,
    });

    if (!result.success) {
      throw result.error;
    }

    console.log(
      `📧 Tracking email sent to ${order.email} for ${order.orderNumber}`
    );

    return res.json({
      success: true,
      message: "Tracking email sent successfully.",
    });

  } catch (err) {
    console.error("❌ Tracking email error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to send tracking email.",
    });
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
console.log(orders.length)
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
router.get("/:publicOrderId", optionalAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      publicOrderId: req.params.publicOrderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});
router.put("/cancel", optionalAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const guestId = req.headers["x-guest-id"];
    const userId = req.user?.id || null;

    // =========================
    // 🔍 FIND ORDER
    // =========================

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // =========================
    // 🔒 SECURITY
    // =========================

    if (userId) {
      // Logged-in user
      if (order.userId?.toString() !== userId.toString()) {
        return res.status(403).json({
          error: "Unauthorized",
        });
      }
    } else {
      // Guest user
      if (!guestId || order.guestId !== guestId) {
        return res.status(403).json({
          error: "Unauthorized",
        });
      }
    }

    // =========================
    // 🚫 VALIDATE STATUS
    // =========================

    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      return res.status(400).json({
        error: "Order cannot be cancelled now",
      });
    }

    // =========================
    // 🔒 ATOMIC CANCEL
    // =========================
    //
    // This is important.
    //
    // If two requests arrive at the same time:
    //
    // Request A → pending/confirmed → cancelled ✅
    // Request B → cannot match anymore ❌
    //
    // Therefore inventory is restored only once.
    //

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        orderStatus: {
          $in: ["pending", "confirmed"],
        },
      },
      {
        $set: {
          orderStatus: "cancelled",
        },
      },
      {
        new: true,
      }
    );

    // =========================
    // 🚫 ALREADY CANCELLED /
    // STATUS CHANGED
    // =========================

    if (!updatedOrder) {
      return res.status(400).json({
        error: "Order was already cancelled or cannot be cancelled now",
      });
    }

    // =========================
    // 📦 RESTORE INVENTORY
    // =========================

    await updateOrderInventory(updatedOrder, "increase");

    // =========================
    // ✅ RESPONSE
    // =========================

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });

  } catch (err) {
    console.error("Cancel error:", err);

    return res.status(500).json({
      error: "Cancel failed",
    });
  }
});












export default router;
