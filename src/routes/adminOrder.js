// routes/adminOrders.js

import express from "express";
import { Order } from "../models/Order.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.js";
import { updateOrderStatus } from "../utils/updateOrderStatus.js";

const router = express.Router();

// =====================================================
// GET ALL ORDERS
// GET /api/admin/orders
// =====================================================

router.get(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const page = Math.max(
        1,
        Number(req.query.page) || 1
      );

      const limit = Math.min(
        100,
        Number(req.query.limit) || 20
      );

      const skip = (page - 1) * limit;

      const filter = {};

      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }

      if (req.query.source) {
        filter.source = req.query.source;
      }

      if (req.query.search) {
        const q = String(req.query.search).slice(
          0,
          100
        );

        filter.$or = [
          {
            orderNumber: {
              $regex: q,
              $options: "i",
            },
          },
          {
            publicOrderId: {
              $regex: q,
              $options: "i",
            },
          },
          {
            email: {
              $regex: q,
              $options: "i",
            },
          },
          {
            "shippingAddress.phone": {
              $regex: q,
              $options: "i",
            },
          },
        ];
      }

      const total =
        await Order.countDocuments(filter);

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          [
            "publicOrderId",
            "orderNumber",
            "email",
            "orderStatus",
            "total",
            "createdAt",
            "paymentMethod",
            "paymentStatus",
            "source",
            "items.mainImage",
            "items.title",
            "items.quantity",
            "shippingAddress.firstName",
            "shippingAddress.lastName",
            "shippingAddress.phone",
          ].join(" ")
        )
        .lean();

      const ordersWithCount = orders.map(
        (order) => ({
          ...order,

          itemCount: Array.isArray(order.items)
            ? order.items.reduce(
                (sum, item) =>
                  sum +
                  (Number(item.quantity) || 1),
                0
              )
            : 0,
        })
      );

      return res.json({
        success: true,
        page,
        limit,
        total,
        orders: ordersWithCount,
      });
    } catch (error) {
      console.error(
        "getOrders error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
      });
    }
  }
);

// =====================================================
// GET SINGLE ORDER BY publicOrderId
// GET /api/admin/orders/:publicOrderId
// =====================================================

router.get(
  "/:publicOrderId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { publicOrderId } = req.params;

      if (!publicOrderId) {
        return res.status(400).json({
          success: false,
          message: "publicOrderId is required",
        });
      }

      const order =
        await Order.findOne({
          publicOrderId,
        })
          .populate(
            "items.productId",
            "publicId title sku slug images price oldPrice category"
          )
          .populate(
            "items.bundleId"
          )
          .populate(
            "items.bundleProducts.productId",
            "publicId title sku slug images price"
          )
          .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "getOrderByPublicId error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// =====================================================
// UPDATE ORDER STATUS
// PATCH /api/admin/orders/:publicOrderId/status
// =====================================================

router.patch(
  "/:publicOrderId/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        publicOrderId,
      } = req.params;

      const {
        status,
        sendEmail,
        awaitEmail,
        reason,
      } = req.body;

      if (!publicOrderId) {
        return res.status(400).json({
          success: false,
          message: "publicOrderId is required",
        });
      }

      const actor =
        req.user?._id || null;

      const order =
        await Order.findOne({
          publicOrderId,
        }).select("_id");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const result =
        await updateOrderStatus(
          order._id,
          status,
          {
            actor,
            reason,
            sendEmail: !!sendEmail,
            awaitEmail: !!awaitEmail,
          }
        );

      if (!result.success) {
        const message =
          result.error?.message ||
          "Failed to update status";

        if (/not found/i.test(message)) {
          return res.status(404).json({
            success: false,
            message,
          });
        }

        return res.status(400).json({
          success: false,
          message,
        });
      }

      return res.json({
        success: true,
        message:
          result.message ||
          "Order status updated",
        order: result.order,
        email:
          result.emailResult || null,
      });
    } catch (error) {
      console.error(
        "updateOrderStatus route error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// =====================================================
// UPDATE TRACKING
// PUT /api/admin/orders/:publicOrderId/tracking
// =====================================================

router.put(
  "/:publicOrderId/tracking",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        publicOrderId,
      } = req.params;

      if (!publicOrderId) {
        return res.status(400).json({
          success: false,
          message: "publicOrderId is required",
        });
      }

      const {
        trackingId,
        estimatedDelivery,
      } = req.body;

      const update = {
        $set: {
          trackingId: trackingId || null,
        },
      };

      if (estimatedDelivery) {
        const date = new Date(
          estimatedDelivery
        );

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid estimatedDelivery date",
          });
        }

        update.$set.estimatedDelivery =
          date;
      }

      const updated =
        await Order.findOneAndUpdate(
          {
            publicOrderId,
          },
          update,
          {
            new: true,
            runValidators: true,
          }
        ).lean();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.json({
        success: true,
        message:
          "Tracking info updated",
        order: updated,
      });
    } catch (error) {
      console.error(
        "updateTrackingInfo error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update tracking info",
      });
    }
  }
);

// =====================================================
// SEND ORDER EMAIL
// POST /api/admin/orders/:publicOrderId/email
// =====================================================

router.post(
  "/:publicOrderId/email",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        publicOrderId,
      } = req.params;

      if (!publicOrderId) {
        return res.status(400).json({
          success: false,
          message: "publicOrderId is required",
        });
      }

      const order =
        await Order.findOne({
          publicOrderId,
        }).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const subject =
        `Order ${order.orderNumber} — Update`;

      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      const trackLink =
        `${frontendUrl}/trackorder?orderNumber=${encodeURIComponent(
          order.orderNumber
        )}`;

      const html = `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
            padding:20px;
          "
        >
          <h2 style="color:#000">
            Order update — ${order.orderNumber}
          </h2>

          <p>
            Your order status is now
            <strong>
              ${order.orderStatus}
            </strong>.
          </p>

          <p>
            <a
              href="${trackLink}"
              style="
                background:#000;
                color:#fff;
                padding:10px 16px;
                border-radius:6px;
                text-decoration:none;
                display:inline-block;
              "
            >
              Track your order
            </a>
          </p>
        </div>
      `;

      sendEmail({
        to: order.email,
        subject,
        html,
      })
        .then(() =>
          console.log(
            `Order email queued/sent to ${order.email}`
          )
        )
        .catch((error) =>
          console.error(
            "Order email error:",
            error
          )
        );

      return res.json({
        success: true,
        message: "Email queued",
      });
    } catch (error) {
      console.error(
        "sendOrderEmail error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to send email",
      });
    }
  }
);

export default router;