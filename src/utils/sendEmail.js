// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log("========== SMTP DEBUG ==========");
  console.log("EMAIL_USER:", user);
  console.log("EMAIL_PASS exists:", !!pass);
  console.log("EMAIL_PASS length:", pass ? pass.length : 0);
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("===============================");

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in environment");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    logger: true,
    debug: true,
  });

  console.log("Starting transporter.verify()...");

  transporter.verify((error, success) => {
    if (error) {
      console.error("========== VERIFY ERROR ==========");
      console.error(error);
      console.error("code:", error.code);
      console.error("command:", error.command);
      console.error("response:", error.response);
      console.error("responseCode:", error.responseCode);
      console.error("==================================");
    } else {
      console.log("✅ SMTP Verify Success");
      console.log(success);
    }
  });

  return transporter;
}

const transporter = createTransporter();

export async function sendEmail({ to, subject, text, html }) {
  console.log("========== SEND EMAIL ==========");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Has HTML:", !!html);
  console.log("Has Text:", !!text);
  console.log("===============================");

  if (!to) {
    throw new Error("Missing 'to' address");
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: subject || "Notification",
      text,
      html,
    });

    console.log("========== EMAIL SENT ==========");
    console.log(info);
    console.log("================================");

    return info;
  } catch (err) {
    console.error("========== SEND ERROR ==========");
    console.error(err);
    console.error("code:", err.code);
    console.error("command:", err.command);
    console.error("response:", err.response);
    console.error("responseCode:", err.responseCode);
    console.error("================================");
    throw err;
  }
}