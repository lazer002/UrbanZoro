// utils/updateOrderStatus.js
import {Order} from "../models/Order.js"; // adjust path to your model
import { isValidObjectId } from "mongoose";
import { templateForStatus } from "./emailTemplates.js";
import { sendEmail } from "./sendEmail.js";

export const VALID_STATUSES = [
  "pending", "confirmed", "dispatched", "shipped",
  "out for delivery", "delivered", "cancelled", "refunded"
];

/**
 * Reads current status from multiple possible fields
 */
function readCurrentStatus(obj = {}) {
  if (!obj) return undefined;
  // return the first non-empty status-like field
  return (
    (typeof obj.orderStatus === "string" && obj.orderStatus) ||
    (typeof obj.status === "string" && obj.status) ||
    (typeof obj.order_status === "string" && obj.order_status) ||
    undefined
  );
}

/**
 * updateOrderStatus - single source of truth
 */
export async function updateOrderStatus(orderId, status, opts = {}) {
  console.log("updateOrderStatus called with:", orderId, status, opts);
  const {
    actor = null,
    reason = null,
    sendEmail: shouldSendEmail = false,
    awaitEmail = false,
    forceEmail = false,
  } = opts;

  // 1) validation
  if (!orderId || !isValidObjectId(orderId)) {
    return { success: false, error: new Error("Invalid orderId") };
  }
  if (!status || typeof status !== "string") {
    return { success: false, error: new Error("Status is required") };
  }

  const normalized = status.trim().toLowerCase();

  if (!VALID_STATUSES.includes(normalized)) {
    return { success: false, error: new Error("Invalid status") };
  }

  // 2) read current (selecting minimal fields + any alternatives)
  const current = await Order.findById(orderId).select("orderStatus status order_status email orderNumber").lean();
  if (!current) {
    return { success: false, error: new Error("Order not found") };
  }

  const currentRaw = readCurrentStatus(current); // may be undefined
  const currentNormalized = typeof currentRaw === "string" ? String(currentRaw).trim().toLowerCase() : undefined;

  console.log("Current status raw:", currentRaw, "| normalized:", currentNormalized, "| new:", normalized);

  const statusUnchanged = currentNormalized === normalized;

  // If status unchanged and caller didn't ask to resend or force, return early
  if (statusUnchanged && !shouldSendEmail && !forceEmail) {
    return { success: true, message: "Status unchanged", order: current };
  }

  // 3) If status changed -> update DB and push history
  // If unchanged but forceEmail is true, we might still want to push a "notified" entry — optional.
  let updated;
  if (!statusUnchanged) {
    const historyEntry = {
      status: normalized,
      by: actor || undefined,
      reason: reason || undefined,
      createdAt: new Date(),
    };

    updated = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: { orderStatus: normalized, updatedAt: new Date() },
        $push: { statusHistory: { $each: [historyEntry], $position: 0 } },
      },
      { new: true, runValidators: true }
    ).lean();
  } else {
    // status unchanged but shouldSendEmail or forceEmail true; reuse current object as updated
    updated = current;
    // OPTIONAL: if you want to record a "resend" audit entry, uncomment:
    // const resendEntry = { status: currentNormalized, by: actor || undefined, reason: reason || "resend", createdAt: new Date() };
    // await Order.findByIdAndUpdate(orderId, { $push: { statusHistory: { $each: [resendEntry], $position: 0 } } });
  }

  // 4) Email (auto-template) — send if requested (on change or forced)
// 4) Always send email when status changes (auto-notify)
let emailResult = null;

try {
  const tmpl = templateForStatus(normalized, { order: updated, actor, reason });
  const sendPromise = sendEmail({
    to: updated.email,
    subject: tmpl.subject,
    text: tmpl.text,
    html: tmpl.html,
  });

  if (awaitEmail) {
    emailResult = await sendPromise;
  } else {
    sendPromise
      .then(r => {
        if (!r.success) console.error("async email failed:", r.error);
      })
      .catch(err => console.error("async sendEmail threw:", err));

    emailResult = { async: true };
  }
} catch (err) {
  console.error("email send error:", err);
  emailResult = { success: false, error: err?.message ?? String(err) };
}

  return { success: true, order: updated, emailResult };
}
