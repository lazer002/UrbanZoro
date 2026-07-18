// backend/src/routes/returns.js

import express from "express";
import mongoose from "mongoose";
import { Return } from "../models/Return.js";
import { Order } from "../models/Order.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { templateForStatus } from "../utils/emailTemplates.js";
const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

async function findOrderByIdOrNumber(idOrNumber) {
  if (!idOrNumber) return null;

  if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
    const byId = await Order.findById(idOrNumber).lean();

    if (byId) {
      return byId;
    }
  }

  return await Order.findOne({
    orderNumber: idOrNumber,
  }).lean();
}

/* =========================================================
   ACTION -> ORDER STATUS
========================================================= */

const ACTION_ORDER_STATUS = {
  refund: "return requested",
  exchange: "exchange requested",
  repair: "repair requested",
};

/* =========================================================
   CREATE RETURN / EXCHANGE / REPAIR REQUEST
========================================================= */

router.post("/", async (req, res) => {
  try {
    console.log("Received return request:", req.body);

    const actor = req.user?._id || null;

    const {
      orderId,
      orderNumber,
      guestEmail,
      items,
    } = req.body;

    if (!orderId && !orderNumber) {
      return res.status(400).json({
        success: false,
        message: "orderId or orderNumber is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items array is required",
      });
    }

    /* ---------------- FIND ORDER ---------------- */

    const order = await findOrderByIdOrNumber(
      orderId || orderNumber
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    /* ---------------- NORMALIZE ITEMS ---------------- */

    const normalizedItems = [];

    for (const it of items) {
      if (!it || typeof it !== "object") {
        return res.status(400).json({
          success: false,
          message: "Each item must be an object",
        });
      }

      const {
        orderItemId,
        productId,
        qty = 1,
      } = it;

      if (!orderItemId) {
        return res.status(400).json({
          success: false,
          message: "orderItemId required for each item",
        });
      }

      let finalProductId = productId || null;

      /* ---------------- FIND PRODUCT ID ---------------- */

      if (
        !finalProductId &&
        Array.isArray(order.items)
      ) {
        const match = order.items.find((oi) => {
          const oid = oi._id
            ? String(oi._id)
            : oi.id || oi.sku;

          return (
            oid &&
            String(oid) === String(orderItemId)
          );
        });

        if (match?.productId) {
          finalProductId = match.productId;
        }
      }

      if (!finalProductId) {
        return res.status(400).json({
          success: false,
          message: `Missing productId for orderItemId ${orderItemId}`,
        });
      }

      /* ---------------- VALIDATE ACTION ---------------- */

      const action = it.action || "refund";

      if (!["refund", "exchange", "repair"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action: ${action}`,
        });
      }

      normalizedItems.push({
        orderItemId: String(orderItemId),

        productId: String(finalProductId),

        title: it.title || "",

        variant: it.variant || "",

        orderedQty:
          it.orderedQty ||
          it.qty ||
          1,

        qty: Number(qty) || 1,

        price: Number(
          it.price ||
          it.unitPrice ||
          0
        ),

        action,

        reason: it.reason || "",

        details: it.details || "",

        photos: Array.isArray(it.photos)
          ? it.photos.filter(Boolean)
          : [],

        exchangeSize:
          it.exchangeSize || null,
      });
    }

    /* =====================================================
       CREATE RMA
    ===================================================== */

    const initialStatus = {
      from: null,
      to: "submitted",
      by: actor,
      note: "Return request submitted",
      at: new Date(),
    };

    const doc = new Return({
      orderId: String(order._id),

      orderNumber:
        orderNumber ||
        order.orderNumber ||
        null,

      guestEmail:
        guestEmail ||
        order.email ||
        null,

      userId:
        req.user?._id ||
        null,

      guestId:
        order.guestId ||
        null,

      items: normalizedItems,

      statusHistory: [
        initialStatus,
      ],

      status: "submitted",
    });

    const saved = await doc.save();

    /* =====================================================
       UPDATE ORIGINAL ORDER STATUS
    ===================================================== */

    const actions = [
      ...new Set(
        normalizedItems.map(
          (item) => item.action
        )
      ),
    ];

    let newOrderStatus;

    /*
      Single action request:

      refund   -> return requested
      exchange -> exchange requested
      repair   -> repair requested
    */

    if (actions.length === 1) {
      newOrderStatus =
        ACTION_ORDER_STATUS[
          actions[0]
        ];
    } else {
      /*
        User selected different actions
        for different products.

        Example:
        Product 1 -> Return
        Product 2 -> Exchange
      */

      newOrderStatus =
        "service requested";
    }

    /*
      IMPORTANT:

      Only set orderStatus here.

      Your OrderSchema
      pre("findOneAndUpdate")
      automatically adds the new status
      to statusHistory.

      Do NOT manually $push statusHistory,
      otherwise you will get duplicate entries.
    */

    await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          orderStatus:
            newOrderStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

try {
  const { subject, text, html } = templateForStatus(newOrderStatus, {
    order,
    actor,
  });

  await sendEmail({
    to: order.email,
    subject,
    text,
    html,
  });
} catch (err) {
  console.error("Return/Exchange/Repair email error:", err);
}


    return res.status(201).json({
      success: true,

      message:
        "Return request created",

      orderStatus:
        newOrderStatus,

      rma: saved,
    });
  } catch (err) {
    console.error(
      "POST /returns error:",
      err
    );

    if (
      err &&
      err.name ===
        "ValidationError"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "ReturnRequest validation failed",

          errors:
            err.errors,
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Server error",
      });
  }
});

/* =========================================================
   GET RETURN BY ORDER NUMBER
========================================================= */

router.get(
  "/order/:orderNumber",
  async (req, res) => {
    try {
      const {
        orderNumber,
      } = req.params;

      const {
        email,
      } = req.query;

      const query = {
        orderNumber:
          String(
            orderNumber
          ),
      };

      if (email) {
        query.guestEmail =
          String(
            email
          ).toLowerCase();
      }

      const ret =
        await Return.findOne(
          query
        )
          .sort({
            createdAt: -1,
          })
          .lean();

      if (!ret) {
        return res
          .status(404)
          .json({
            message:
              "No return found",
          });
      }

      return res.json(
        ret
      );
    } catch (err) {
      return res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

/* =========================================================
   GET ALL RETURNS
========================================================= */

router.get(
  "/",
  async (req, res) => {
    try {
      const {
        orderNumber,
        rmaNumber,
        limit = 20,
      } = req.query;

      const q = {};

      if (orderNumber) {
        q.orderNumber =
          String(
            orderNumber
          );
      }

      if (rmaNumber) {
        q.rmaNumber =
          String(
            rmaNumber
          );
      }

      const returns =
        await Return.find(
          q
        )
          .sort({
            createdAt: -1,
          })
          .limit(
            Math.min(
              Number(limit) ||
                20,
              100
            )
          )
          .lean();

      return res.json(
        returns
      );
    } catch (err) {
      return res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

/* =========================================================
   GET RETURN BY RMA
========================================================= */

router.get(
  "/:rmaNumber",
  async (req, res) => {
    try {
      const {
        rmaNumber,
      } = req.params;

      if (!rmaNumber) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "RMA number is required",
          });
      }

      const returnReq =
        await Return.findOne({
          rmaNumber,
        }).lean();

      if (!returnReq) {
        return res
          .status(404)
          .json({
            success: false,

            message: `Return request not found for RMA ${rmaNumber}`,
          });
      }

      return res.json({
        success: true,

        returnRequest:
          returnReq,
      });
    } catch (error) {
      console.error(
        "GET /returns/:rmaNumber error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error",
        });
    }
  }
);

/* =========================================================
   UPDATE RETURN STATUS
========================================================= */

router.patch(
  "/:id/status",
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        status,
        note = "",
      } = req.body;

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

      if (
        !status ||
        !allowed.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message: `Invalid status: ${status}`,
          });
      }

      const ret =
        await Return.findById(
          id
        );

      if (!ret) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Return request not found",
          });
      }

      const prevStatus =
        ret.status;

      ret.status =
        status;

      ret.statusHistory.push({
        from:
          prevStatus,

        to:
          status,

        by:
          req.user?._id ||
          null,

        note,

        at:
          new Date(),
      });

      const saved =
        await ret.save();

      return res.json({
        success: true,

        message:
          "Status updated",

        rma:
          saved,
      });
    } catch (error) {
      console.error(
        "PATCH /returns/:id/status error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while updating status",
        });
    }
  }
);

export default router;