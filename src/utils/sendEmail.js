// utils/sendEmail.js

import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.EMAIL_PASS;

if (!process.env.EMAIL_USER || !apiKey) {
  throw new Error("EMAIL_USER and EMAIL_PASS must be set in environment");
}

const resend = new Resend(apiKey);

/**
 * sendEmail
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<{ success: boolean, info?: any, error?: any }>}
 */
export async function sendEmail({ to, subject, text, html }) {
  console.log(
    `sendEmail to=${to} subject=${subject} html=${Boolean(html)} text=${Boolean(text)}`
  );

  if (!to) {
    return {
      success: false,
      error: new Error("Missing 'to' address"),
    };
  }

  if (!subject) subject = "Notification";

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: text ?? undefined,
      html: html ?? undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      info: data,
    };
  } catch (err) {
    console.error("sendEmail error:", err);
    return {
      success: false,
      error: err,
    };
  }
}