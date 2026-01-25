// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config()

function createTransporter() {
  let user = process.env.EMAIL_USER;
  let pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in environment");
  }

  // If custom SMTP host is provided, use it; otherwise use provider service (Gmail)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT) === "465",
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }

  // Default to Gmail-compatible transport (works when EMAIL_USER is a Gmail account and pass is an app password)
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
}

const transporter = createTransporter();

/**
 * sendEmail
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<{ success: boolean, info?: any, error?: any }>}
 */
export async function sendEmail({ to, subject, text, html }) {
  console.log(`sendEmail to=${to} subject=${subject} html=${Boolean(html)} text=${Boolean(text)}`);
  if (!to) return { success: false, error: new Error("Missing 'to' address") };
  if (!subject) subject = "Notification";

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const mail = { from, to, subject, text: text ?? undefined, html: html ?? undefined };

  try {
    const info = await transporter.sendMail(mail);
    return { success: true, info };
  } catch (err) {
    console.error("sendEmail error:", err?.message || err);
    return { success: false, error: err };
  }
}
