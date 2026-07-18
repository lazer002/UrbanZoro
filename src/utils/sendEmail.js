// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config()

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(user,pass)
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
  });

  transporter.verify((error) => {
    if (error) {
      console.error("❌ SMTP Verify Error:", error);
    } else {
      console.log("✅ SMTP Server is ready");
    }
  });

  return transporter;
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
  }  catch (err) {
  console.error("sendEmail error:", err);
  throw err;
}
}
