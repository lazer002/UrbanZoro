// utils/emailTemplates.js

/**
 * Generates rich HTML + text templates for each order status
 * @param {string} status
 * @param {object} param1
 * @returns {{subject:string, text:string, html:string}}
 */
export function templateForStatus(status, { order, actor, reason } = {}) {
  console.log("templateForStatus called with:", status, { orderId: order?._id, actor, reason });

  const s = String(status || "").trim().toLowerCase();

  // Basic info
  const siteName = "Urban District";
  const siteURL = "https://yourstore.com";
  const supportEmail = "support@yourstore.com";
  const trackingURL = order?.shipment?.trackingNumber
    ? `${siteURL}/track/${order.shipment.trackingNumber}`
    : null;

  // Common layout parts
  const header = `
  <div style="background:#000;color:#fff;padding:20px;text-align:center;font-family:'Inter',Arial,sans-serif;">
    <h1 style="margin:0;font-size:24px;">${siteName}</h1>
  </div>`;

  const footer = `
  <div style="background:#f9f9f9;color:#555;padding:20px;text-align:center;font-family:'Inter',Arial,sans-serif;font-size:13px;">
    <p>Need help? <a href="mailto:${supportEmail}" style="color:#000;text-decoration:none;">Contact support</a></p>
    <p>&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
  </div>`;

  const wrapper = (content, color = "#000") => `
  <div style="font-family:'Inter',Arial,sans-serif;background:#fff;border-radius:8px;max-width:600px;margin:30px auto;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    ${header}
    <div style="padding:32px 24px;">
      ${content}
      <div style="margin-top:32px;text-align:center;">
        <a href="${siteURL}/orders/${order?.orderNumber}" 
          style="display:inline-block;background:${color};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          View Order
        </a>
      </div>
    </div>
    ${footer}
  </div>`;

  // Function to format dynamic order lines
  const orderSummary = order?.items?.length
    ? `<div style="margin-top:16px;">
        <h3 style="font-size:16px;margin-bottom:8px;">Order Summary</h3>
        ${order.items
          .map(
            (i) => `
            <div style="display:flex;align-items:center;margin-bottom:10px;">
              <img src="${i.mainImage}" alt="${i.title}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:10px;">
              <div style="flex:1;">
                <p style="margin:0;font-weight:600;">${i.title}</p>
                <p style="margin:0;color:#666;font-size:13px;">Qty: ${i.quantity} • ₹${i.price}</p>
              </div>
            </div>`
          )
          .join("")}
      </div>`
    : "";

  // Unified design for all templates
  const templates = {
 pending: ({ order }) => {
  const subject = `Order ${order.orderNumber} — Order Received`;
  const body = `
    <h2 style="margin-top:0;">Thanks — we received your order</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Thanks for shopping with ${siteName}. We’ve received your order <strong>${order.orderNumber}</strong> and will confirm payment shortly.</p>
    <p style="margin-top:12px;color:#666;font-size:14px;">What happens next: we’ll verify payment and begin preparing your items. You’ll receive a confirmation once payment is cleared.</p>
    ${orderSummary}
    <p style="margin-top:16px;font-size:13px;color:#666;">If you have questions, reply to this email or contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `;
  return {
    subject,
    text: `We received your order ${order.orderNumber}. We'll confirm payment and update you soon.`,
    html: wrapper(body, "#111"),
  };
},

confirmed: ({ order }) => {
  const subject = `Order ${order.orderNumber} — Confirmed`;
  const body = `
    <h2 style="margin-top:0;">Order Confirmed</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Your order <strong>${order.orderNumber}</strong> has been confirmed. Our team is now preparing your package for shipment.</p>
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">Estimated processing time: 1–2 business days. We'll notify you with tracking details once the order ships.</p>
    <p style="margin-top:16px;font-size:13px;color:#666;">Need help? <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `;
  return {
    subject,
    text: `Your order ${order.orderNumber} is confirmed and being processed.`,
    html: wrapper(body, "#008060"),
  };
},

dispatched: ({ order }) => {
  const subject = `Order ${order.orderNumber} — Dispatched from Warehouse`;
  const body = `
    <h2 style="margin-top:0;">Your order is on the way</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Good news — your order <strong>${order.orderNumber}</strong> has left our warehouse and is en route to you.</p>
    ${trackingURL ? `<p style="margin-top:12px;">Track your shipment: <a href="${trackingURL}">${trackingURL}</a></p>` : ""}
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">Delivery partner will attempt to deliver to the address on file. If you need to update delivery instructions, contact support.</p>
    <p style="margin-top:16px;font-size:13px;color:#666;">Questions? <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `;
  return {
    subject,
    text: `Order ${order.orderNumber} has been dispatched. Track it here: ${trackingURL || siteURL}`,
    html: wrapper(body, "#0070f3"),
  };
},

shipped: ({ order }) => {
  const subject = `Order ${order.orderNumber} — Shipped`;
  const body = `
    <h2 style="margin-top:0;">Shipment Confirmed</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Your order <strong>${order.orderNumber}</strong> has been shipped and is on its way to you.</p>
    ${trackingURL ? `<p style="margin-top:12px;"><a href="${trackingURL}" style="color:#0070f3;">View tracking details</a></p>` : ""}
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">If you won’t be available to receive the package, you can provide alternative delivery instructions via our support team.</p>
  `;
  return {
    subject,
    text: `Your order ${order.orderNumber} has shipped. Track: ${trackingURL || siteURL}`,
    html: wrapper(body, "#0070f3"),
  };
},

"out for delivery": ({ order }) => {
  const subject = `Order ${order.orderNumber} — Out for Delivery Today`;
  const body = `
    <h2 style="margin-top:0;">Out for delivery</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Your order <strong>${order.orderNumber}</strong> is out for delivery today. Please ensure someone is available to receive it.</p>
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">If you need to reschedule or provide delivery notes, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `;
  return {
    subject,
    text: `Order ${order.orderNumber} is out for delivery today.`,
    html: wrapper(body, "#ff9500"),
  };
},

delivered: ({ order }) => {
  const subject = `Order ${order.orderNumber} — Delivered`;
  const body = `
    <h2 style="margin-top:0;">Delivered — Enjoy!</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>We’re happy to let you know that your order <strong>${order.orderNumber}</strong> has been delivered.</p>
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">If everything looks good, we’d love a quick review — it helps us and other customers. If something’s wrong, please <a href="${siteURL}/contact">let us know</a> or reply to this email.</p>
  `;
  return {
    subject,
    text: `Your order ${order.orderNumber} has been delivered. Let us know if there are any issues.`,
    html: wrapper(body, "#28a745"),
  };
},

cancelled: ({ order, reason }) => {
  const subject = `Order ${order.orderNumber} — Cancelled`;
  const body = `
    <h2 style="margin-top:0;">Order Cancelled</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>Your order <strong>${order.orderNumber}</strong> has been cancelled.${reason ? ` Reason: ${reason}` : ""}</p>
    <p style="margin-top:12px;color:#666;font-size:14px;">If this was unexpected, please contact our support team and we’ll help sort it out.</p>
    ${orderSummary}
    <p style="margin-top:12px;font-size:13px;color:#666;">Support: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
  `;
  return {
    subject,
    text: `Your order ${order.orderNumber} was cancelled. ${reason ? `Reason: ${reason}` : ""}`,
    html: wrapper(body, "#d9534f"),
  };
},

refunded: ({ order, reason }) => {
  const subject = `Order ${order.orderNumber} — Refund Processed`;
  const body = `
    <h2 style="margin-top:0;">Refund Processed</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>We’ve processed a refund for order <strong>${order.orderNumber}</strong>. ${reason ? `Reason: ${reason}` : "The refunded amount will reflect in your account shortly."}</p>
    ${orderSummary}
    <p style="margin-top:12px;color:#666;font-size:14px;">Refund timelines depend on your bank or payment provider and may take 3–7 business days.</p>
    <p style="margin-top:12px;font-size:13px;color:#666;">Questions? <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `;
  return {
    subject,
    text: `Refund for order ${order.orderNumber} has been processed. ${reason ? `Reason: ${reason}` : ""}`,
    html: wrapper(body, "#6c63ff"),
  };
},

    placed: ({ order }) => {
  const subject = `Thank you for your order, ${order.shippingAddress?.firstName || "there"}! 🎉`;
  const body = `
    <h2 style="margin-top:0;">Order Confirmed — Thank You for Shopping with Us!</h2>
    <p>Hi ${order.shippingAddress?.firstName || ""},</p>
    <p>We’re excited to let you know that your order <strong>${order.orderNumber}</strong> has been successfully placed.</p>
    <p>
      We’ll start preparing your items for shipment right away. Once your order is on the move, you’ll receive a tracking link.
    </p>
    <div style="margin:24px 0;padding:16px;background:#f8f8f8;border-radius:6px;">
      <h3 style="margin:0 0 8px 0;">Order Summary</h3>
      ${order.items
        ?.map(
          (i) => `
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <img src="${i.mainImage}" alt="${i.title}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:10px;">
          <div style="flex:1;">
            <p style="margin:0;font-weight:600;">${i.title}</p>
            <p style="margin:0;color:#666;font-size:13px;">Qty: ${i.quantity} • ₹${i.price}</p>
          </div>
        </div>
      `
        )
        .join("")}
      <hr style="margin:12px 0;border:none;border-top:1px solid #eee;">
      <p style="margin:0;font-weight:600;">Subtotal: ₹${order.subtotal}</p>
      <p style="margin:0;">Shipping: ₹${order.shippingFee}</p>
      <p style="margin:8px 0 0;font-weight:bold;font-size:16px;">Total: ₹${order.total}</p>
    </div>
    <p style="margin-top:16px;">
      You can view your order status anytime from your account or by clicking the button below.
    </p>
    <p>Thank you for choosing <strong>Urban District</strong> — we truly appreciate your trust in us!</p>
  `;
  return {
    subject,
    text: `Thank you for your order ${order.orderNumber}. We’ll notify you when it ships.`,
    html: wrapper(body, "#111"),
  };
},

  };

  const fn = templates[s] || templates.pending;
  return fn({ order, actor, reason });
}
