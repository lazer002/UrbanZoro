// utils/createNotification.js

import { Notification } from "../models/Notification.js";
export const createNotification = async ({
  type = "order",
  title,
  body,
  userId = null,
  guestId = null,
  payload = {},
  priority = "normal",
}) => {
  try {
    if (!title || !body) {
      console.log("Notification skipped: missing title/body");
      return null;
    }

    const notif = await Notification.create({
      type,
      title,
      body,
      userId,
      guestId,
      payload,
      priority,
    });

    return notif;
  } catch (err) {
    console.error("Notification error:", err);
    return null;
  }
};