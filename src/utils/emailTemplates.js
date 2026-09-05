const BRAND = {
  name: "GARRIB",
  url: "https://garrib.com",
  support: "support@garrib.com",

  accent: "#B6FF2E",
  black: "#111111",
  bg: "#F4F4F2",
  white: "#FFFFFF",
  border: "#E7E7E3",
  text: "#171717",
  muted: "#6F6F6A",
  soft: "#F8F8F6",
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const firstName = (order) =>
  escapeHtml(order?.shippingAddress?.firstName || "there");

const statusLabel = (status) =>
  String(status || "ORDER UPDATE")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

/* =========================================================
   STATUS BADGE
========================================================= */

const badge = (label) => `
<span
  style="
    display:inline-block;
    padding:9px 15px;
    background:${BRAND.accent};
    color:${BRAND.black};
    border-radius:999px;
    font-family:Arial,Helvetica,sans-serif;
    font-size:10px;
    line-height:1;
    font-weight:800;
    letter-spacing:1.8px;
    text-transform:uppercase;
  "
>
  ${escapeHtml(label)}
</span>
`;

/* =========================================================
   HEADER
========================================================= */

const header = (status) => `
<div
  style="
    background:${BRAND.black};
    padding:42px 28px 34px;
    text-align:center;
  "
>
  <div
    style="
      width:58px;
      height:58px;
      margin:0 auto;
      border-radius:17px;
      background:${BRAND.accent};
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:28px;
      line-height:58px;
      font-weight:900;
    "
  >
    G
  </div>

  <div
    style="
      margin-top:18px;
      color:#FFFFFF;
      font-family:Arial,Helvetica,sans-serif;
      font-size:27px;
      line-height:32px;
      font-weight:900;
      letter-spacing:5px;
    "
  >
    GARRIB
  </div>

  <div
    style="
      margin-top:7px;
      color:#A8A8A3;
      font-family:Arial,Helvetica,sans-serif;
      font-size:10px;
      line-height:15px;
      font-weight:600;
      letter-spacing:2.5px;
      text-transform:uppercase;
    "
  >
    Premium Streetwear
  </div>

  <div style="margin-top:23px;">
    ${badge(status)}
  </div>
</div>
`;

/* =========================================================
   ORDER META
========================================================= */

const orderMeta = (order) => `
<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border-collapse:collapse;
    background:${BRAND.soft};
    border:1px solid ${BRAND.border};
  "
>
  <tr>

    <td
      style="
        padding:17px 18px;
        font-family:Arial,Helvetica,sans-serif;
      "
    >
      <div
        style="
          color:#92928D;
          font-size:9px;
          line-height:13px;
          font-weight:700;
          letter-spacing:1.5px;
          text-transform:uppercase;
        "
      >
        Order number
      </div>

      <div
        style="
          margin-top:5px;
          color:${BRAND.black};
          font-size:15px;
          line-height:20px;
          font-weight:800;
        "
      >
        ${escapeHtml(order?.orderNumber || "—")}
      </div>
    </td>

    <td
      align="right"
      style="
        padding:17px 18px;
        font-family:Arial,Helvetica,sans-serif;
      "
    >
      <div
        style="
          color:#92928D;
          font-size:9px;
          line-height:13px;
          font-weight:700;
          letter-spacing:1.5px;
          text-transform:uppercase;
        "
      >
        Payment
      </div>

      <div
        style="
          margin-top:5px;
          color:${BRAND.black};
          font-size:14px;
          line-height:20px;
          font-weight:800;
          text-transform:capitalize;
        "
      >
        ${escapeHtml(order?.paymentMethod || "—")}
      </div>
    </td>

  </tr>
</table>
`;

/* =========================================================
   NORMAL PRODUCT
========================================================= */

const productRow = (item) => {
  const title = escapeHtml(item?.title || "GARRIB Product");
  const image = escapeHtml(item?.mainImage || "");

  return `
<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border-collapse:collapse;
    border-bottom:1px solid ${BRAND.border};
  "
>
  <tr>

    <td
      width="76"
      valign="top"
      style="padding:17px 0;"
    >
      <div
        style="
          width:68px;
          height:78px;
          overflow:hidden;
          border-radius:12px;
          background:#EEEEEB;
        "
      >

        ${
          image
            ? `
          <img
            src="${image}"
            alt="${title}"
            width="68"
            height="78"
            style="
              display:block;
              width:68px;
              height:78px;
              object-fit:cover;
              border:0;
            "
          />
        `
            : ""
        }

      </div>
    </td>

    <td
      valign="middle"
      style="
        padding:17px 12px 17px 13px;
      "
    >

      <div
        style="
          color:${BRAND.black};
          font-family:Arial,Helvetica,sans-serif;
          font-size:14px;
          line-height:20px;
          font-weight:800;
        "
      >
        ${title}
      </div>

      <div
        style="
          margin-top:5px;
          color:${BRAND.muted};
          font-family:Arial,Helvetica,sans-serif;
          font-size:11px;
          line-height:17px;
        "
      >
        ${
          item?.variant
            ? `Size ${escapeHtml(item.variant)} &nbsp;•&nbsp; `
            : ""
        }

        Qty ${Number(item?.quantity || 0)}
      </div>

    </td>

    <td
      width="90"
      align="right"
      valign="middle"
      style="
        padding:17px 0;
        font-family:Arial,Helvetica,sans-serif;
        color:${BRAND.black};
        font-size:14px;
        line-height:20px;
        font-weight:800;
      "
    >
      ${money(item?.price)}
    </td>

  </tr>
</table>
`;
};

/* =========================================================
   BUNDLE
========================================================= */

const bundleRow = (item) => {
  const title = escapeHtml(item?.title || "GARRIB Bundle");
  const image = escapeHtml(item?.mainImage || "");

  const products = Array.isArray(item?.bundleProducts)
    ? item.bundleProducts
    : [];

  const names = products
    .map((product) =>
      escapeHtml(product?.title || "Product")
    )
    .slice(0, 4)
    .join(" • ");

  return `
<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border-collapse:collapse;
    border-bottom:1px solid ${BRAND.border};
  "
>
  <tr>

    <td
      width="76"
      valign="top"
      style="padding:17px 0;"
    >

      <div
        style="
          width:68px;
          height:78px;
          overflow:hidden;
          border-radius:12px;
          background:#EEEEEB;
        "
      >

        ${
          image
            ? `
          <img
            src="${image}"
            alt="${title}"
            width="68"
            height="78"
            style="
              display:block;
              width:68px;
              height:78px;
              object-fit:cover;
              border:0;
            "
          />
        `
            : ""
        }

      </div>

    </td>

    <td
      valign="middle"
      style="padding:17px 12px 17px 13px;"
    >

      <div
        style="
          display:inline-block;
          margin-bottom:5px;
          padding:4px 8px;
          background:#EEEEEB;
          border-radius:5px;
          color:#777770;
          font-family:Arial,Helvetica,sans-serif;
          font-size:8px;
          font-weight:800;
          letter-spacing:1px;
          text-transform:uppercase;
        "
      >
        Bundle${item?.customBundle ? " • Custom" : ""}
      </div>

      <div
        style="
          color:${BRAND.black};
          font-family:Arial,Helvetica,sans-serif;
          font-size:14px;
          line-height:20px;
          font-weight:800;
        "
      >
        ${title}
      </div>

      <div
        style="
          margin-top:5px;
          color:${BRAND.muted};
          font-family:Arial,Helvetica,sans-serif;
          font-size:10px;
          line-height:16px;
        "
      >
        ${names || "Curated GARRIB pieces"}

        &nbsp;•&nbsp;

        Qty ${Number(item?.quantity || 0)}
      </div>

    </td>

    <td
      width="90"
      align="right"
      valign="middle"
      style="
        padding:17px 0;
        font-family:Arial,Helvetica,sans-serif;
        color:${BRAND.black};
        font-size:14px;
        line-height:20px;
        font-weight:800;
      "
    >
      ${money(item?.price)}
    </td>

  </tr>
</table>
`;
};

/* =========================================================
   ORDER SUMMARY
========================================================= */

const orderSummary = (order) => `
<div style="margin-top:30px;">

  <div
    style="
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:19px;
      line-height:25px;
      font-weight:900;
    "
  >
    Order summary
  </div>

  <div
    style="
      margin-top:14px;
      padding:0 18px;
      border:1px solid ${BRAND.border};
      background:#FFFFFF;
    "
  >

    ${
      (order?.items || [])
        .map((item) =>
          item?.bundleId || item?.customBundle
            ? bundleRow(item)
            : productRow(item)
        )
        .join("")
    }

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="border-collapse:collapse;"
    >

      <tr>

        <td
          style="
            padding:18px 0 5px;
            color:${BRAND.muted};
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
          "
        >
          Subtotal
        </td>

        <td
          align="right"
          style="
            padding:18px 0 5px;
            color:${BRAND.black};
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            font-weight:700;
          "
        >
          ${money(order?.subtotal)}
        </td>

      </tr>

      <tr>

        <td
          style="
            padding:5px 0;
            color:${BRAND.muted};
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
          "
        >
          Shipping
        </td>

        <td
          align="right"
          style="
            padding:5px 0;
            color:${BRAND.black};
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            font-weight:700;
          "
        >
          ${
            Number(order?.shippingFee || 0) === 0
              ? "FREE"
              : money(order?.shippingFee)
          }
        </td>

      </tr>

      ${
        Number(order?.couponDiscount || 0) > 0
          ? `
        <tr>

          <td
            style="
              padding:5px 0;
              color:#4C7A25;
              font-family:Arial,Helvetica,sans-serif;
              font-size:12px;
            "
          >
            Discount
          </td>

          <td
            align="right"
            style="
              padding:5px 0;
              color:#4C7A25;
              font-family:Arial,Helvetica,sans-serif;
              font-size:12px;
              font-weight:700;
            "
          >
            -${money(order?.couponDiscount)}
          </td>

        </tr>
      `
          : ""
      }

      <tr>

        <td
          colspan="2"
          style="padding:10px 0 0;"
        >
          <div
            style="
              height:1px;
              background:${BRAND.border};
            "
          ></div>
        </td>

      </tr>

      <tr>

        <td
          style="
            padding:14px 0 18px;
            color:${BRAND.black};
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            font-weight:900;
          "
        >
          Total
        </td>

        <td
          align="right"
          style="
            padding:14px 0 18px;
            color:${BRAND.black};
            font-family:Arial,Helvetica,sans-serif;
            font-size:19px;
            font-weight:900;
          "
        >
          ${money(order?.total)}
        </td>

      </tr>

    </table>

  </div>
</div>
`;

/* =========================================================
   SHIPPING
========================================================= */

const shippingCard = (order) => {
  const address = order?.shippingAddress || {};

  return `
<div style="margin-top:20px;">

  <div
    style="
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:16px;
      line-height:22px;
      font-weight:900;
    "
  >
    Delivery details
  </div>

  <div
    style="
      margin-top:11px;
      padding:17px 18px;
      background:${BRAND.soft};
      border:1px solid ${BRAND.border};
      color:${BRAND.muted};
      font-family:Arial,Helvetica,sans-serif;
      font-size:12px;
      line-height:20px;
    "
  >

    <strong style="color:${BRAND.black};">
      ${escapeHtml(
        `${address.firstName || ""} ${
          address.lastName || ""
        }`.trim() || "Customer"
      )}
    </strong>

    <br />

    ${escapeHtml(address.address || "")}

    ${
      address.apartment
        ? `<br />${escapeHtml(address.apartment)}`
        : ""
    }

    <br />

    ${escapeHtml(
      [address.city, address.state, address.zip]
        .filter(Boolean)
        .join(", ")
    )}

    ${
      address.country
        ? `<br />${escapeHtml(address.country)}`
        : ""
    }

    ${
      address.phone
        ? `<br />${escapeHtml(address.phone)}`
        : ""
    }

  </div>
</div>
`;
};

/* =========================================================
   CTA
========================================================= */

const cta = (order, label = "VIEW ORDER") => `
<div
  style="
    margin-top:28px;
    text-align:center;
  "
>
  <a
    href="${BRAND.url}/orders/${encodeURIComponent(
      order?.orderNumber || ""
    )}"
    style="
      display:inline-block;
      padding:15px 28px;
      background:${BRAND.black};
      color:${BRAND.accent};
      border-radius:999px;
      font-family:Arial,Helvetica,sans-serif;
      font-size:11px;
      line-height:15px;
      font-weight:800;
      letter-spacing:1.2px;
      text-decoration:none;
    "
  >
    ${escapeHtml(label)}
  </a>
</div>
`;

/* =========================================================
   TRACKING
========================================================= */

const trackingCard = (order) => {
  const trackingNumber =
    order?.shipment?.trackingNumber ||
    order?.fulfillmentDetails?.trackingNumber ||
    order?.trackingId;

  if (!trackingNumber) return "";

  const url =
    `${BRAND.url}/track/` +
    encodeURIComponent(trackingNumber);

  return `
<div
  style="
    margin-top:20px;
    padding:20px;
    background:${BRAND.black};
  "
>

  <div
    style="
      color:${BRAND.accent};
      font-family:Arial,Helvetica,sans-serif;
      font-size:9px;
      line-height:13px;
      font-weight:800;
      letter-spacing:1.5px;
      text-transform:uppercase;
    "
  >
    Tracking number
  </div>

  <div
    style="
      margin-top:7px;
      color:#FFFFFF;
      font-family:Arial,Helvetica,sans-serif;
      font-size:17px;
      line-height:23px;
      font-weight:800;
      word-break:break-all;
    "
  >
    ${escapeHtml(trackingNumber)}
  </div>

  <a
    href="${url}"
    style="
      display:inline-block;
      margin-top:15px;
      padding:11px 18px;
      background:${BRAND.accent};
      color:${BRAND.black};
      border-radius:999px;
      font-family:Arial,Helvetica,sans-serif;
      font-size:10px;
      line-height:13px;
      font-weight:800;
      text-decoration:none;
    "
  >
    TRACK PACKAGE
  </a>

</div>
`;
};

/* =========================================================
   FOOTER
========================================================= */

const footer = () => `
<div
  style="
    padding:30px 24px;
    background:#FAFAF8;
    border-top:1px solid ${BRAND.border};
    text-align:center;
  "
>

  <div
    style="
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:16px;
      line-height:20px;
      font-weight:900;
      letter-spacing:2.5px;
    "
  >
    GARRIB
  </div>

  <div
    style="
      margin-top:8px;
      color:#8A8A85;
      font-family:Arial,Helvetica,sans-serif;
      font-size:11px;
      line-height:18px;
    "
  >
    Premium streetwear. Made to stand out.
  </div>

  <a
    href="mailto:${BRAND.support}"
    style="
      display:inline-block;
      margin-top:14px;
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:11px;
      line-height:16px;
      font-weight:700;
      text-decoration:underline;
    "
  >
    ${BRAND.support}
  </a>

  <div
    style="
      margin-top:18px;
      color:#A0A09B;
      font-family:Arial,Helvetica,sans-serif;
      font-size:9px;
      line-height:14px;
    "
  >
    © ${new Date().getFullYear()}
    GARRIB. All rights reserved.
  </div>

</div>
`;

/* =========================================================
   MAIN WRAPPER
========================================================= */

const wrapper = (status, body, order) => `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
  />

  <meta
    name="x-apple-disable-message-reformatting"
  />

  <title>
    ${escapeHtml(statusLabel(status))} • GARRIB
  </title>

</head>

<body
  style="
    margin:0;
    padding:0;
    background:${BRAND.bg};
    font-family:Arial,Helvetica,sans-serif;
    color:${BRAND.text};
  "
>

  <!-- PREHEADER -->

  <div
    style="
      display:none;
      max-height:0;
      overflow:hidden;
      opacity:0;
    "
  >
    ${escapeHtml(statusLabel(status))}
    — GARRIB order
    ${escapeHtml(order?.orderNumber || "")}
  </div>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      border-collapse:collapse;
      background:${BRAND.bg};
    "
  >

    <tr>

      <td
        align="center"
        style="padding:28px 12px;"
      >

        <table
          width="680"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:680px;
            border-collapse:collapse;
            background:#FFFFFF;
            border:1px solid ${BRAND.border};
            overflow:hidden;
          "
        >

          <tr>

            <td>

              ${header(status)}

              <div
                style="
                  padding:34px 32px 38px;
                "
              >

                ${orderMeta(order)}

                ${body}

                ${shippingCard(order)}

              </div>

              ${footer()}

            </td>

          </tr>

        </table>

        <div
          style="
            max-width:680px;
            padding:15px 10px 0;
            color:#9A9A95;
            font-family:Arial,Helvetica,sans-serif;
            font-size:9px;
            line-height:14px;
            text-align:center;
          "
        >
          This is an automated message from GARRIB.
        </div>

      </td>

    </tr>

  </table>

</body>

</html>
`;

/* =========================================================
   STANDARD BODY
========================================================= */

const standardBody = ({
  eyebrow,
  title,
  message,
  order,
  extra = "",
  button = "VIEW ORDER",
}) => `
<div style="margin-top:28px;">

  <div
    style="
      color:#8A8A84;
      font-family:Arial,Helvetica,sans-serif;
      font-size:9px;
      line-height:14px;
      font-weight:800;
      letter-spacing:1.8px;
      text-transform:uppercase;
    "
  >
    ${escapeHtml(eyebrow)}
  </div>

  <div
    style="
      margin-top:10px;
      color:${BRAND.black};
      font-family:Arial,Helvetica,sans-serif;
      font-size:31px;
      line-height:38px;
      font-weight:900;
      letter-spacing:-0.6px;
    "
  >
    ${title}
  </div>

  <div
    style="
      margin-top:13px;
      color:${BRAND.muted};
      font-family:Arial,Helvetica,sans-serif;
      font-size:14px;
      line-height:23px;
    "
  >
    ${message}
  </div>

  ${extra}

  ${orderSummary(order)}

  ${cta(order, button)}

</div>
`;

/* =========================================================
   TEMPLATES
========================================================= */

const templates = {

  /* ---------------- PLACED ---------------- */

  placed: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Confirmed`;

    const body = standardBody({

      eyebrow: "Order confirmation",

      title: "Your order is in.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        thank you for choosing GARRIB.

        Your order has been successfully placed
        and our team is getting it ready for you.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has been placed successfully.`,

      html:
        wrapper("ORDER PLACED", body, order),
    };
  },

  /* ---------------- PENDING ---------------- */

  pending: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Received`;

    const body = standardBody({

      eyebrow: "Payment verification",

      title: "We're checking your payment.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        we've received your order.

        Your payment is currently being verified.
        We'll update you as soon as the order moves
        to the next stage.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} is awaiting payment verification.`,

      html:
        wrapper("PAYMENT PENDING", body, order),
    };
  },

  /* ---------------- CONFIRMED ---------------- */

  confirmed: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Confirmed`;

    const body = standardBody({

      eyebrow: "Order confirmed",

      title: "Everything looks good.",

      message: `
        Great news,
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>.

        Your payment has been confirmed and your
        order is now being prepared by our warehouse team.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has been confirmed.`,

      html:
        wrapper("CONFIRMED", body, order),
    };
  },

  /* ---------------- DISPATCHED ---------------- */

  dispatched: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Dispatched`;

    const body = standardBody({

      eyebrow: "Order dispatched",

      title: "Your package is on its way.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your order has left our warehouse and has
        been handed over to our delivery partner.
      `,

      order,

      extra:
        trackingCard(order),
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has been dispatched.`,

      html:
        wrapper("DISPATCHED", body, order),
    };
  },

  /* ---------------- SHIPPED ---------------- */

  shipped: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Shipped`;

    const body = standardBody({

      eyebrow: "Shipment update",

      title: "Your shipment is moving.",

      message: `
        Your GARRIB order has officially shipped.

        Use the tracking details below to follow
        its journey.
      `,

      order,

      extra:
        trackingCard(order),
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has shipped.`,

      html:
        wrapper("SHIPPED", body, order),
    };
  },

  /* ---------------- OUT FOR DELIVERY ---------------- */

  "out for delivery": ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Out for Delivery`;

    const body = standardBody({

      eyebrow: "Delivery update",

      title: "Today's the day.",

      message: `
        Your order is out for delivery.

        Please keep your phone available and make sure
        someone is available to receive the package.
      `,

      order,

      extra: `
        <div
          style="
            margin-top:20px;
            padding:20px;
            background:${BRAND.black};
          "
        >

          <div
            style="
              color:${BRAND.accent};
              font-size:22px;
              line-height:28px;
              font-weight:900;
            "
          >
            Out for delivery
          </div>

          <div
            style="
              margin-top:7px;
              color:#D0D0CC;
              font-size:12px;
              line-height:19px;
            "
          >
            Your delivery partner should reach you soon.
          </div>

        </div>
      `,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} is out for delivery.`,

      html:
        wrapper("OUT FOR DELIVERY", body, order),
    };
  },

  /* ---------------- DELIVERED ---------------- */

  delivered: ({ order }) => {

    const subject =
      `Order ${order.orderNumber} Delivered`;

    const body = standardBody({

      eyebrow: "Delivery complete",

      title: "Enjoy your new pieces.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your GARRIB order has been successfully delivered.

        We hope you love every piece.
      `,

      order,

      extra: `
        <div
          style="
            margin-top:20px;
            padding:23px;
            background:${BRAND.black};
            text-align:center;
          "
        >

          <div
            style="
              color:${BRAND.accent};
              font-size:42px;
              font-weight:900;
            "
          >
            ✓
          </div>

          <div
            style="
              margin-top:6px;
              color:#FFFFFF;
              font-size:19px;
              font-weight:900;
            "
          >
            Delivered successfully
          </div>

        </div>
      `,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has been delivered.`,

      html:
        wrapper("DELIVERED", body, order),
    };
  },

  /* ---------------- CANCELLED ---------------- */

  cancelled: ({ order, reason }) => {

    const subject =
      `Order ${order.orderNumber} Cancelled`;

    const body = standardBody({

      eyebrow: "Order cancelled",

      title: "Your order has been cancelled.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your order has been cancelled.

        ${
          reason
            ? `
              Reason:
              <strong style="color:${BRAND.black};">
                ${escapeHtml(reason)}
              </strong>.
            `
            : `
              If this wasn't expected,
              please contact our support team.
            `
        }
      `,

      order,
    });

    return {
      subject,

      text:
        `Your order ${order.orderNumber} has been cancelled.`,

      html:
        wrapper("CANCELLED", body, order),
    };
  },

  /* ---------------- REFUNDED ---------------- */

  refunded: ({ order, reason }) => {

    const subject =
      `Refund Processed • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Refund completed",

      title: "Your refund has been processed.",

      message: `
        We've successfully initiated your refund.

        ${
          reason
            ? `
              Reason:
              <strong style="color:${BRAND.black};">
                ${escapeHtml(reason)}
              </strong>.
            `
            : `
              The amount should reflect in your original
              payment method within 3–7 business days.
            `
        }
      `,

      order,

      extra: `
        <div
          style="
            margin-top:20px;
            padding:19px;
            background:${BRAND.soft};
            border:1px solid ${BRAND.border};
          "
        >

          <div
            style="
              color:#8A8A84;
              font-size:9px;
              font-weight:800;
              letter-spacing:1.4px;
              text-transform:uppercase;
            "
          >
            Refund amount
          </div>

          <div
            style="
              margin-top:7px;
              color:${BRAND.black};
              font-size:25px;
              font-weight:900;
            "
          >
            ${money(order?.total)}
          </div>

        </div>
      `,
    });

    return {
      subject,

      text:
        `Refund processed for order ${order.orderNumber}.`,

      html:
        wrapper("REFUNDED", body, order),
    };
  },

  /* ---------------- RETURN REQUESTED ---------------- */

  "return requested": ({ order }) => {

    const subject =
      `Return Request Received • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Return request",

      title: "We've received your request.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your return request has been submitted successfully.

        Our support team will review it and notify you
        once a decision has been made.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your return request for order ${order.orderNumber} has been received.`,

      html:
        wrapper("RETURN REQUESTED", body, order),
    };
  },

  /* ---------------- RETURN APPROVED ---------------- */

  "return approved": ({ order }) => {

    const subject =
      `Return Approved • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Return approved",

      title: "Your return is approved.",

      message: `
        Good news.

        Your return request has been approved.

        Please pack the products securely and keep
        original tags and accessories where applicable.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your return request for order ${order.orderNumber} has been approved.`,

      html:
        wrapper("RETURN APPROVED", body, order),
    };
  },

  /* ---------------- RETURN REJECTED ---------------- */

  "return rejected": ({ order, reason }) => {

    const subject =
      `Return Request Declined • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Return update",

      title: "We couldn't approve the return.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        after reviewing your request,
        we're unable to approve this return.

        ${
          reason
            ? `
              Reason:
              <strong style="color:${BRAND.black};">
                ${escapeHtml(reason)}
              </strong>.
            `
            : `
              Please contact support if you'd like
              more information.
            `
        }
      `,

      order,
    });

    return {
      subject,

      text:
        `Your return request for order ${order.orderNumber} has been rejected.`,

      html:
        wrapper("RETURN REJECTED", body, order),
    };
  },

  /* ---------------- RETURNED ---------------- */

  returned: ({ order }) => {

    const subject =
      `Return Received • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Return received",

      title: "We've received your package.",

      message: `
        Your returned package has safely arrived at
        our warehouse.

        Our quality team is inspecting the products
        before the next step is processed.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your returned package for order ${order.orderNumber} has been received.`,

      html:
        wrapper("RETURNED", body, order),
    };
  },

  /* ---------------- EXCHANGE REQUESTED ---------------- */

  "exchange requested": ({ order }) => {

    const subject =
      `Exchange Request Received • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Exchange request",

      title: "We've received your request.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your exchange request has been submitted successfully.

        Our team will review it shortly.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your exchange request for order ${order.orderNumber} has been received.`,

      html:
        wrapper("EXCHANGE REQUESTED", body, order),
    };
  },

  /* ---------------- EXCHANGE APPROVED ---------------- */

  "exchange approved": ({ order }) => {

    const subject =
      `Exchange Approved • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Exchange approved",

      title: "Your exchange is approved.",

      message: `
        Your exchange request has been approved.

        Please hand over the original product
        to our courier when contacted.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your exchange request for order ${order.orderNumber} has been approved.`,

      html:
        wrapper("EXCHANGE APPROVED", body, order),
    };
  },

  /* ---------------- EXCHANGE REJECTED ---------------- */

  "exchange rejected": ({ order, reason }) => {

    const subject =
      `Exchange Request Declined • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Exchange update",

      title: "We couldn't approve the exchange.",

      message: `
        ${
          reason
            ? `
              Reason:
              <strong style="color:${BRAND.black};">
                ${escapeHtml(reason)}
              </strong>.
            `
            : `
              Unfortunately, your exchange request does
              not meet our exchange policy.
            `
        }

        If you believe this decision is incorrect,
        our support team will be happy to review
        your request.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your exchange request for order ${order.orderNumber} has been rejected.`,

      html:
        wrapper("EXCHANGE REJECTED", body, order),
    };
  },

  /* ---------------- EXCHANGE PROCESSING ---------------- */

  "exchange processing": ({ order }) => {

    const subject =
      `Exchange Processing • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Exchange processing",

      title: "Your replacement is being prepared.",

      message: `
        We've received your returned item and our
        warehouse is preparing your replacement.

        You'll receive another update once it ships.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your exchange for order ${order.orderNumber} is being processed.`,

      html:
        wrapper("EXCHANGE PROCESSING", body, order),
    };
  },

  /* ---------------- EXCHANGED ---------------- */

  exchanged: ({ order }) => {

    const subject =
      `Exchange Completed • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Exchange complete",

      title: "Your exchange is complete.",

      message: `
        Your replacement product has been successfully
        processed.

        Thank you for choosing GARRIB.
      `,

      order,

      extra: `
        <div
          style="
            margin-top:20px;
            padding:23px;
            background:${BRAND.black};
            text-align:center;
          "
        >

          <div
            style="
              color:${BRAND.accent};
              font-size:42px;
              font-weight:900;
            "
          >
            ✓
          </div>

          <div
            style="
              margin-top:6px;
              color:#FFFFFF;
              font-size:19px;
              font-weight:900;
            "
          >
            Exchange successful
          </div>

        </div>
      `,
    });

    return {
      subject,

      text:
        `Your exchange for order ${order.orderNumber} has been completed.`,

      html:
        wrapper("EXCHANGED", body, order),
    };
  },

  /* ---------------- REPAIR REQUESTED ---------------- */

  "repair requested": ({ order }) => {

    const subject =
      `Repair Request Received • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Repair request",

      title: "We've received your repair request.",

      message: `
        Hi
        <strong style="color:${BRAND.black};">
          ${firstName(order)}
        </strong>,

        your repair request has been submitted successfully.

        Our specialists will review it and contact
        you with the next steps.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your repair request for order ${order.orderNumber} has been received.`,

      html:
        wrapper("REPAIR REQUESTED", body, order),
    };
  },

  /* ---------------- REPAIR APPROVED ---------------- */

  "repair approved": ({ order }) => {

    const subject =
      `Repair Approved • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Repair approved",

      title: "Your repair is approved.",

      message: `
        Your repair request has been approved.

        Please hand over the item to our pickup
        partner when contacted.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your repair request for order ${order.orderNumber} has been approved.`,

      html:
        wrapper("REPAIR APPROVED", body, order),
    };
  },

  /* ---------------- REPAIR REJECTED ---------------- */

  "repair rejected": ({ order, reason }) => {

    const subject =
      `Repair Request Declined • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Repair update",

      title: "We couldn't approve your repair.",

      message: `
        ${
          reason
            ? `
              Reason:
              <strong style="color:${BRAND.black};">
                ${escapeHtml(reason)}
              </strong>.
            `
            : `
              Unfortunately, your request does not
              qualify under our repair policy.
            `
        }

        Our support team will be happy to help
        if you have questions.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your repair request for order ${order.orderNumber} has been rejected.`,

      html:
        wrapper("REPAIR REJECTED", body, order),
    };
  },

  /* ---------------- REPAIR PROCESSING ---------------- */

  "repair processing": ({ order }) => {

    const subject =
      `Repair In Progress • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Repair in progress",

      title: "Our specialists are on it.",

      message: `
        Your product is currently undergoing
        inspection and repair.

        We'll notify you as soon as the repair
        has been completed.
      `,

      order,
    });

    return {
      subject,

      text:
        `Your repair for order ${order.orderNumber} is currently in progress.`,

      html:
        wrapper("REPAIR PROCESSING", body, order),
    };
  },

  /* ---------------- REPAIRED ---------------- */

  repaired: ({ order }) => {

    const subject =
      `Repair Completed • ${order.orderNumber}`;

    const body = standardBody({

      eyebrow: "Repair complete",

      title: "Your repair is complete.",

      message: `
        Great news.

        Your product has been successfully repaired
        and is ready for shipment or collection.
      `,

      order,

      extra: `
        <div
          style="
            margin-top:20px;
            padding:23px;
            background:${BRAND.black};
            text-align:center;
          "
        >

          <div
            style="
              color:${BRAND.accent};
              font-size:42px;
              font-weight:900;
            "
          >
            ✓
          </div>

          <div
            style="
              margin-top:6px;
              color:#FFFFFF;
              font-size:19px;
              font-weight:900;
            "
          >
            Repair completed
          </div>

        </div>
      `,
    });

    return {
      subject,

      text:
        `Your repair for order ${order.orderNumber} has been completed.`,

      html:
        wrapper("REPAIRED", body, order),
    };
  },
  tracking: ({ order, trackLink }) => {
  const firstName =
    order.shippingAddress?.firstName || "there";

  const subject = `Track Your Order — ${order.orderNumber}`;

  const text = `
Hi ${firstName},

You can track your order ${order.orderNumber} anytime using the link below:

${trackLink}

Thank you for shopping with DripDesi.
We'll notify you once your items are shipped.
  `.trim();

  const html = `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: auto;
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 24px;
    ">

      <h2 style="
        text-align: center;
        color: #000;
        margin-bottom: 20px;
      ">
        🖤 Your DripDesi Order
      </h2>

      <p style="font-size: 15px; color: #333;">
        Hi ${firstName},
      </p>

      <p style="font-size: 14px; color: #555;">
        You can track your order
        <strong>${order.orderNumber}</strong>
        anytime using the button below.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a
          href="${trackLink}"
          style="
            display: inline-block;
            background: #000;
            color: #fff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
          "
        >
          Track My Order
        </a>
      </div>

      <p style="font-size: 13px; color: #777;">
        If the button doesn't work, you can copy and paste
        this link into your browser:
        <br /><br />

        <a
          href="${trackLink}"
          style="
            color: #000;
            word-break: break-all;
          "
        >
          ${trackLink}
        </a>
      </p>

      <hr style="
        margin: 30px 0;
        border: none;
        border-top: 1px solid #eee;
      " />

      <p style="
        font-size: 12px;
        color: #999;
        text-align: center;
      ">
        Thank you for shopping with
        <strong>DripDesi</strong>.<br />
        We'll notify you once your items are shipped.
      </p>

    </div>
  `;

  return {
    subject,
    text,
    html,
  };
},
};

/* =========================================================
   EXPORT
========================================================= */

export const getEmailTemplate = ({
  status,
  order,
  actor,
  reason,
  trackLink,
}) => {
  const s = String(status || "").toLowerCase();

  const fn = templates[s] || templates.pending;

  return fn({
    order,
    actor,
    reason,
    trackLink,
  });
};