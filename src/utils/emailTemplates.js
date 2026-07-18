// PART 1
// Replace everything from:
// const siteName ...
// through wrapper() and orderSummary()

const BRAND = {
  name: "GARRIB",
  url: "https://garrib.com",
  support: "support@garrib.com",
  accent: "#B6FF2E",
  black: "#111111",
  bg: "#F5F5F5",
  white: "#FFFFFF",
  border: "#EAEAEA",
  text: "#111111",
  muted: "#777777",
};

const trackingURL = order?.shipment?.trackingNumber
  ? `${BRAND.url}/track/${order.shipment.trackingNumber}`
  : null;

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const badge = (label) => `
<div
style="
display:inline-block;
padding:8px 18px;
background:${BRAND.accent};
border-radius:999px;
font-size:11px;
font-weight:800;
letter-spacing:2px;
text-transform:uppercase;
color:${BRAND.black};
">
${label}
</div>
`;

const header = (status) => `
<div
style="
background:${BRAND.black};
padding:54px 42px 42px;
text-align:center;
">

<div
style="
width:74px;
height:74px;
border-radius:22px;
background:${BRAND.accent};
margin:auto;
line-height:74px;
font-size:34px;
font-weight:900;
color:${BRAND.black};
">
G
</div>

<h1
style="
margin:24px 0 6px;
font-size:38px;
letter-spacing:6px;
font-weight:900;
color:white;
">
GARRIB
</h1>

<p
style="
margin:0;
font-size:13px;
letter-spacing:4px;
text-transform:uppercase;
color:#BFBFBF;
">
Premium Streetwear
</p>

<div style="margin-top:30px;">
${badge(status)}
</div>

</div>
`;

const footer = `
<div
style="
padding:40px;
text-align:center;
background:#FAFAFA;
border-top:1px solid ${BRAND.border};
">

<p
style="
margin:0;
font-size:18px;
font-weight:800;
letter-spacing:2px;
color:${BRAND.black};
">
GARRIB
</p>

<p
style="
margin:14px 0;
color:${BRAND.muted};
font-size:14px;
line-height:24px;
">
Premium Fashion Experience
</p>

<a
href="mailto:${BRAND.support}"
style="
display:inline-block;
padding:14px 28px;
background:${BRAND.black};
color:${BRAND.accent};
text-decoration:none;
border-radius:999px;
font-weight:700;
">
CONTACT SUPPORT
</a>

<p
style="
margin-top:26px;
font-size:12px;
color:#999;
">
© ${new Date().getFullYear()} GARRIB. All Rights Reserved.
</p>

</div>
`;

const priceCard = () => `
<div
style="
margin-top:28px;
background:#FAFAFA;
border:1px solid ${BRAND.border};
border-radius:22px;
padding:24px;
">

<table width="100%" cellpadding="0" cellspacing="0">

<tr>
<td style="padding:8px 0;color:${BRAND.muted};">
Subtotal
</td>

<td align="right"
style="
font-weight:700;
color:${BRAND.black};
">
${money(order?.subtotal)}
</td>
</tr>

<tr>
<td style="padding:8px 0;color:${BRAND.muted};">
Shipping
</td>

<td align="right"
style="
font-weight:700;
color:${BRAND.black};
">
${money(order?.shippingFee)}
</td>
</tr>

<tr>
<td colspan="2">
<div
style="
height:1px;
background:${BRAND.border};
margin:14px 0;
">
</div>
</td>
</tr>

<tr>

<td
style="
font-size:18px;
font-weight:800;
color:${BRAND.black};
">
Total
</td>

<td
align="right"
style="
font-size:22px;
font-weight:900;
color:${BRAND.black};
">
${money(order?.total)}
</td>

</tr>

</table>

</div>
`;

const orderSummary = `
<div style="margin-top:36px;">

<h3
style="
margin:0 0 20px;
font-size:22px;
font-weight:800;
color:${BRAND.black};
">
Items in your order
</h3>

${(order?.items || [])
    .map(
      (item) => `
<div
style="
display:flex;
align-items:center;
margin-bottom:18px;
padding:18px;
border:1px solid ${BRAND.border};
border-radius:20px;
">

<img
src="${item.mainImage}"
style="
width:82px;
height:82px;
border-radius:18px;
object-fit:cover;
margin-right:18px;
"
/>

<div style="flex:1;">

<div
style="
font-size:17px;
font-weight:800;
color:${BRAND.black};
margin-bottom:8px;
">
${item.title}
</div>

<div
style="
font-size:14px;
color:${BRAND.muted};
">
Size ${item.variant || "-"} • Qty ${item.quantity}
</div>

</div>

<div
style="
font-size:18px;
font-weight:800;
color:${BRAND.black};
">
${money(item.price)}
</div>

</div>
`
    )
    .join("")}

${priceCard()}

</div>
`;

const wrapper = (status, body) => `
<!DOCTYPE html>

<html>

<body
style="
margin:0;
padding:40px;
background:${BRAND.bg};
font-family:Inter,Arial,sans-serif;
">

<table
width="100%"
cellpadding="0"
cellspacing="0">

<tr>

<td align="center">

<table
width="680"
cellpadding="0"
cellspacing="0"
style="
background:white;
border-radius:28px;
overflow:hidden;
border:1px solid ${BRAND.border};
">

<tr>

<td>

${header(status)}

<div
style="
padding:54px;
">

${body}

<div
style="
margin-top:42px;
text-align:center;
">

<a
href="${BRAND.url}/orders/${order?.orderNumber}"
style="
display:inline-block;
padding:18px 42px;
background:${BRAND.black};
color:${BRAND.accent};
font-weight:800;
letter-spacing:1px;
text-decoration:none;
border-radius:999px;
">
VIEW ORDER
</a>

</div>

</div>

${footer}

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;


// PART 2
// Replace the templates object starting from:
const templates = {
  placed: ({ order }) => {
    const subject = `Order ${order.orderNumber} Confirmed`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
ORDER CONFIRMATION
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
color:${BRAND.black};
font-weight:900;
">
Your order has been placed.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
margin:0;
">
Hi <strong>${order.shippingAddress?.firstName || "there"}</strong>,
thank you for choosing <strong>GARRIB</strong>.
We've received your order and our team is preparing it for dispatch.
</p>

<div
style="
margin-top:32px;
padding:24px;
background:#FAFAFA;
border-radius:22px;
border:1px solid ${BRAND.border};
">

<div
style="
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#999;
margin-bottom:10px;
">
ORDER NUMBER
</div>

<div
style="
font-size:30px;
font-weight:900;
color:${BRAND.black};
">
${order.orderNumber}
</div>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order ${order.orderNumber} has been placed successfully.`,
      html: wrapper("ORDER PLACED", body),
    };
  },

  pending: ({ order }) => {
    const subject = `Order ${order.orderNumber} Received`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
PAYMENT VERIFICATION
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We're verifying your payment.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},
your order has been received successfully.

Our team is currently verifying your payment before processing your order.
</p>

<div
style="
margin-top:32px;
padding:24px;
background:#FAFAFA;
border:1px solid ${BRAND.border};
border-radius:22px;
">

<strong>What's next?</strong>

<ul
style="
margin:16px 0 0 18px;
padding:0;
line-height:30px;
color:${BRAND.muted};
">

<li>Payment Verification</li>

<li>Quality Inspection</li>

<li>Packing</li>

<li>Shipment</li>

</ul>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order is awaiting payment verification.`,
      html: wrapper("PAYMENT PENDING", body),
    };
  },

  confirmed: ({ order }) => {
    const subject = `Order ${order.orderNumber} Confirmed`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
ORDER CONFIRMED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Everything looks good.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Great news ${order.shippingAddress?.firstName || ""},

your payment has been confirmed and your order is now being prepared by our warehouse.
</p>

<div
style="
margin-top:30px;
padding:24px;
border-radius:22px;
background:#111;
color:white;
">

<div
style="
font-size:22px;
font-weight:900;
color:${BRAND.accent};
">
Preparing Your Package
</div>

<p
style="
margin:16px 0 0;
line-height:28px;
color:#DDD;
">
Our team is carefully inspecting, packing and preparing your products for shipment.

You'll receive another email as soon as your package leaves our warehouse.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order has been confirmed.`,
      html: wrapper("CONFIRMED", body),
    };
  },


  dispatched: ({ order }) => {
    const subject = `Order ${order.orderNumber} Dispatched`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
DISPATCHED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your order has left our warehouse.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},
your package is now with our delivery partner and is on its journey to you.
</p>

${trackingURL
        ? `
<div
style="
margin-top:32px;
padding:26px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#B6FF2E;
margin-bottom:12px;
">
TRACKING NUMBER
</div>

<div
style="
font-size:22px;
font-weight:900;
color:white;
word-break:break-all;
">
${order.shipment.trackingNumber}
</div>

<a
href="${trackingURL}"
style="
display:inline-block;
margin-top:22px;
padding:16px 34px;
background:#B6FF2E;
color:#111;
font-weight:800;
text-decoration:none;
border-radius:999px;
">
TRACK PACKAGE
</a>

</div>`
        : ""
      }

${orderSummary}
`;

    return {
      subject,
      text: `Your order has been dispatched.`,
      html: wrapper("DISPATCHED", body),
    };
  },

  shipped: ({ order }) => {
    const subject = `Order ${order.orderNumber} Shipped`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
SHIPPED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your shipment is on the move.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Your order has officially been shipped.

You can follow every step of the delivery using the tracking link below.
</p>

${trackingURL
        ? `
<div
style="
margin-top:32px;
padding:24px;
border:1px solid ${BRAND.border};
border-radius:22px;
background:#FAFAFA;
">

<a
href="${trackingURL}"
style="
display:inline-block;
padding:16px 34px;
background:#111;
color:#B6FF2E;
text-decoration:none;
border-radius:999px;
font-weight:800;
">
VIEW LIVE TRACKING
</a>

</div>`
        : ""
      }

${orderSummary}
`;

    return {
      subject,
      text: `Your order has shipped.`,
      html: wrapper("SHIPPED", body),
    };
  },

  "out for delivery": ({ order }) => {
    const subject = `Order ${order.orderNumber} Out for Delivery`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
OUT FOR DELIVERY
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Today's the day.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Your order is out for delivery.

Please keep your phone available and ensure someone can receive the package.
</p>

<div
style="
margin-top:30px;
padding:24px;
border-radius:22px;
background:#111;
">

<div
style="
font-size:30px;
font-weight:900;
color:#B6FF2E;
">
🚚 On the way
</div>

<p
style="
margin:18px 0 0;
color:#DDD;
line-height:28px;
">
Our delivery partner will arrive soon.

Thank you for shopping with GARRIB.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order is out for delivery.`,
      html: wrapper("OUT FOR DELIVERY", body),
    };
  },

  delivered: ({ order }) => {
    const subject = `Order ${order.orderNumber} Delivered`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
DELIVERED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Enjoy your new pieces.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

Your order has been successfully delivered.

Thank you for choosing GARRIB.
</p>

<div
style="
margin-top:30px;
padding:30px;
border-radius:22px;
background:#111;
text-align:center;
">

<div
style="
font-size:56px;
margin-bottom:10px;
">
✓
</div>

<div
style="
font-size:30px;
font-weight:900;
color:#B6FF2E;
">
Delivered Successfully
</div>

<p
style="
margin-top:18px;
color:#DDD;
line-height:28px;
">
We hope you love every piece.

If something isn't right, simply reply to this email and we'll help immediately.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order has been delivered.`,
      html: wrapper("DELIVERED", body),
    };
  },

  cancelled: ({ order, reason }) => {
    const subject = `Order ${order.orderNumber} Cancelled`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
ORDER CANCELLED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your order has been cancelled.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

Your order has been cancelled.

${reason
        ? `Reason: <strong>${reason}</strong>.`
        : "If this wasn't expected, our support team is here to help."
      }
</p>

<div
style="
margin-top:32px;
padding:24px;
border:2px solid #111;
border-radius:22px;
background:#FFF;
">

<div
style="
font-size:20px;
font-weight:800;
color:#111;
margin-bottom:12px;
">
Need Assistance?
</div>

<p
style="
margin:0;
line-height:28px;
color:#666;
">
If you still wish to receive these products,
contact our support team and we'll be happy to assist.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your order has been cancelled.`,
      html: wrapper("CANCELLED", body),
    };
  },

  refunded: ({ order, reason }) => {
    const subject = `Refund Processed • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REFUND COMPLETED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your refund has been processed.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
We've successfully initiated your refund.

${reason
        ? `Reason: <strong>${reason}</strong>.`
        : "The amount should reflect in your original payment method within 3–7 business days."
      }
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#FAFAFA;
border-radius:22px;
border:1px solid ${BRAND.border};
">

<div
style="
font-size:18px;
font-weight:800;
color:${BRAND.black};
">
Refund Amount
</div>

<div
style="
margin-top:12px;
font-size:34px;
font-weight:900;
color:${BRAND.black};
">
${money(order.total)}
</div>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Refund processed for order ${order.orderNumber}.`,
      html: wrapper("REFUNDED", body),
    };
  },

  "return requested": ({ order }) => {
    const subject = `Return Request Received • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
RETURN REQUEST
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We've received your return request.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

Your return request has been received successfully.

Our support team will review it shortly and notify you once it's approved.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:24px;
font-weight:900;
color:${BRAND.accent};
">
Return Request Submitted
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
No further action is required at the moment.

We'll email you as soon as the request has been reviewed.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your return request has been received.`,
      html: wrapper("RETURN REQUESTED", body),
    };
  },

  "return approved": ({ order }) => {
    const subject = `Return Approved • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
RETURN APPROVED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your return has been approved.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Good news!

Your return request has been approved.

Please pack the items securely and hand them over to our pickup partner when contacted.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#FAFAFA;
border-radius:22px;
border:1px solid ${BRAND.border};
">

<div
style="
font-size:22px;
font-weight:900;
color:${BRAND.black};
">
Next Steps
</div>

<ul
style="
margin:18px 0 0 20px;
padding:0;
line-height:30px;
color:${BRAND.muted};
">

<li>Pack the products securely.</li>

<li>Keep original tags if applicable.</li>

<li>Hand over the package to our courier.</li>

</ul>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your return request has been approved.`,
      html: wrapper("RETURN APPROVED", body),
    };
  },

  "return rejected": ({ order, reason }) => {
    const subject = `Return Request Declined • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
RETURN REJECTED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Unfortunately, we couldn't approve your return.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

After reviewing your request, we're unable to approve the return.

${reason
        ? `Reason: <strong>${reason}</strong>.`
        : "Please contact support if you'd like more information."
      }
</p>

<div
style="
margin-top:30px;
padding:28px;
border:2px solid #111;
border-radius:22px;
">

<div
style="
font-size:20px;
font-weight:900;
color:${BRAND.black};
">
Need Help?
</div>

<p
style="
margin:14px 0 0;
line-height:28px;
color:${BRAND.muted};
">
Our support team will gladly review your case again if needed.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your return request has been rejected.`,
      html: wrapper("RETURN REJECTED", body),
    };
  },

  returned: ({ order }) => {
    const subject = `Return Received • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
RETURN RECEIVED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We've received your returned package.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Your returned package has safely arrived at our warehouse.

Our quality team is inspecting the products before processing your refund.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:22px;
font-weight:900;
color:${BRAND.accent};
">
Inspection in Progress
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
Once inspection is completed, your refund will be initiated automatically.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `We've received your returned package.`,
      html: wrapper("RETURNED", body),
    };
  },

  "exchange requested": ({ order }) => {
    const subject = `Exchange Request Received • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
EXCHANGE REQUEST
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We've received your exchange request.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

Your exchange request has been received successfully.

Our team will review your request shortly.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:24px;
font-weight:900;
color:${BRAND.accent};
">
Exchange Request Submitted
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
We'll notify you once your request has been approved or if additional information is required.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your exchange request has been received.`,
      html: wrapper("EXCHANGE REQUESTED", body),
    };
  },

  "exchange approved": ({ order }) => {
    const subject = `Exchange Approved • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
EXCHANGE APPROVED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your exchange has been approved.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Great news!

Your exchange request has been approved.

Please hand over the original product to our courier during pickup.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#FAFAFA;
border-radius:22px;
border:1px solid ${BRAND.border};
">

<div
style="
font-size:22px;
font-weight:900;
color:${BRAND.black};
">
Next Steps
</div>

<ul
style="
margin:18px 0 0 20px;
padding:0;
line-height:30px;
color:${BRAND.muted};
">

<li>Pack the original item securely.</li>

<li>Keep tags and accessories if applicable.</li>

<li>Our courier will collect the package.</li>

<li>Your replacement will be shipped after verification.</li>

</ul>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your exchange request has been approved.`,
      html: wrapper("EXCHANGE APPROVED", body),
    };
  },

  "exchange rejected": ({ order, reason }) => {
    const subject = `Exchange Request Declined • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
EXCHANGE REJECTED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We couldn't approve your exchange.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
${reason
        ? `Reason: <strong>${reason}</strong>.`
        : "Unfortunately your exchange request does not meet our exchange policy."
      }
</p>

<div
style="
margin-top:30px;
padding:28px;
border:2px solid #111;
border-radius:22px;
">

<div
style="
font-size:20px;
font-weight:900;
color:${BRAND.black};
">
Need Assistance?
</div>

<p
style="
margin:14px 0 0;
line-height:28px;
color:${BRAND.muted};
">
If you believe this decision is incorrect, our support team will be happy to review your request again.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your exchange request has been rejected.`,
      html: wrapper("EXCHANGE REJECTED", body),
    };
  },

  "exchange processing": ({ order }) => {
    const subject = `Exchange Processing • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
EXCHANGE PROCESSING
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your replacement is being prepared.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
We've received your returned item and our warehouse is preparing your replacement product.

You'll receive another email once it has been shipped.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:24px;
font-weight:900;
color:${BRAND.accent};
">
Preparing Replacement
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
Our warehouse team is carefully packing your replacement order.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your exchange is currently being processed.`,
      html: wrapper("EXCHANGE PROCESSING", body),
    };
  },

  exchanged: ({ order }) => {
    const subject = `Exchange Completed • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
EXCHANGE COMPLETED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your exchange is complete.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Your replacement product has been successfully processed and completed.

Thank you for choosing GARRIB.
</p>

<div
style="
margin-top:30px;
padding:30px;
background:#111;
border-radius:22px;
text-align:center;
">

<div
style="
font-size:54px;
margin-bottom:12px;
">
✓
</div>

<div
style="
font-size:28px;
font-weight:900;
color:${BRAND.accent};
">
Exchange Successful
</div>

<p
style="
margin-top:16px;
color:#DDD;
line-height:28px;
">
We hope your replacement is exactly what you were looking for.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your exchange has been completed.`,
      html: wrapper("EXCHANGED", body),
    };
  },

  "repair requested": ({ order }) => {
    const subject = `Repair Request Received • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REPAIR REQUEST
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We've received your repair request.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Hi ${order.shippingAddress?.firstName || ""},

Your repair request has been submitted successfully.

Our specialists will review your request and contact you with the next steps shortly.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:24px;
font-weight:900;
color:${BRAND.accent};
">
Repair Request Submitted
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
We'll notify you once your repair request has been reviewed.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your repair request has been received.`,
      html: wrapper("REPAIR REQUESTED", body),
    };
  },

  "repair approved": ({ order }) => {
    const subject = `Repair Approved • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REPAIR APPROVED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your repair has been approved.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Good news!

Your repair request has been approved.

Please hand over the item to our pickup partner when contacted.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#FAFAFA;
border-radius:22px;
border:1px solid ${BRAND.border};
">

<div
style="
font-size:22px;
font-weight:900;
color:${BRAND.black};
">
Next Steps
</div>

<ul
style="
margin:18px 0 0 20px;
padding:0;
line-height:30px;
color:${BRAND.muted};
">

<li>Pack the product securely.</li>

<li>Our courier will collect the package.</li>

<li>Our technicians will inspect and repair it.</li>

</ul>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your repair request has been approved.`,
      html: wrapper("REPAIR APPROVED", body),
    };
  },

  "repair rejected": ({ order, reason }) => {
    const subject = `Repair Request Declined • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REPAIR REJECTED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
We couldn't approve your repair request.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
${reason
        ? `Reason: <strong>${reason}</strong>.`
        : "Unfortunately your request does not qualify under our repair policy."
      }
</p>

<div
style="
margin-top:30px;
padding:28px;
border:2px solid #111;
border-radius:22px;
">

<div
style="
font-size:20px;
font-weight:900;
color:${BRAND.black};
">
Need Assistance?
</div>

<p
style="
margin:14px 0 0;
line-height:28px;
color:${BRAND.muted};
">
Our support team will gladly review your request again if needed.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your repair request has been rejected.`,
      html: wrapper("REPAIR REJECTED", body),
    };
  },

  "repair processing": ({ order }) => {
    const subject = `Repair In Progress • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REPAIR IN PROGRESS
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Our technicians are working on your item.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Your product is currently undergoing inspection and repair.

We'll notify you as soon as the repair has been completed.
</p>

<div
style="
margin-top:30px;
padding:28px;
background:#111;
border-radius:22px;
">

<div
style="
font-size:24px;
font-weight:900;
color:${BRAND.accent};
">
Repair In Progress
</div>

<p
style="
margin:16px 0 0;
color:#DDD;
line-height:28px;
">
Our specialists are carefully restoring your product to its best condition.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your repair is currently in progress.`,
      html: wrapper("REPAIR PROCESSING", body),
    };
  },

  repaired: ({ order }) => {
    const subject = `Repair Completed • ${order.orderNumber}`;

    const body = `
<p
style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#888;
font-weight:700;
">
REPAIR COMPLETED
</p>

<h2
style="
margin:12px 0 20px;
font-size:38px;
line-height:46px;
font-weight:900;
color:${BRAND.black};
">
Your repair is complete.
</h2>

<p
style="
font-size:17px;
line-height:30px;
color:${BRAND.muted};
">
Great news!

Your product has been successfully repaired and is ready for shipment or collection.
</p>

<div
style="
margin-top:30px;
padding:30px;
background:#111;
border-radius:22px;
text-align:center;
">

<div
style="
font-size:54px;
margin-bottom:12px;
">
✓
</div>

<div
style="
font-size:28px;
font-weight:900;
color:${BRAND.accent};
">
Repair Completed
</div>

<p
style="
margin-top:16px;
color:#DDD;
line-height:28px;
">
Thank you for trusting GARRIB Care. We appreciate your patience.
</p>

</div>

${orderSummary}
`;

    return {
      subject,
      text: `Your repair has been completed.`,
      html: wrapper("REPAIRED", body),
    };
  },

};

const fn = templates[s] || templates.pending;
return fn({ order, actor, reason });


