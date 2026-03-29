import express from "express";
import { Notification } from "../models/Notification.js";

const router = express.Router();

/* =======================================================
   GET ALL NOTIFICATIONS (user / guest)
======================================================= */
router.get("/", async (req, res) => {
  try {
    console.log("Fetching notifications for user:", req.user?._id, "guestId:", req.headers["x-guest-id"]);
    const guestId = req.headers["x-guest-id"];

    let query = {};

    if (req.user) {
      query.userId = req.user._id;
    } else if (guestId) {
      query.guestId = guestId;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
console.log("Fetched notifications:", notifications);
    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error("GET notifications error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   MARK AS READ
======================================================= */
router.patch("/:id/read", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        read: true,
        readAt: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      notification: notif,
    });
  } catch (err) {
    console.error("READ error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   MARK ALL AS REA
======================================================= */
router.patch("/read-all", async (req, res) => {
  try {
    const guestId = req.headers["x-guest-id"];

    let query = {};

    if (req.user) {
      query.userId = req.user._id;
    } else if (guestId) {
      query.guestId = guestId;
    }

    await Notification.updateMany(query, {
      read: true,
      readAt: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("READ ALL error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   DELETE NOTIFICATION
======================================================= */
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   UNREAD COUNT (FOR BADGE 🔴)
======================================================= */
router.get("/unread-count", async (req, res) => {
  try {
    const guestId = req.headers["x-guest-id"];

    let query = { read: false };

    if (req.user) {
      query.userId = req.user._id;
    } else if (guestId) {
      query.guestId = guestId;
    }

    const count = await Notification.countDocuments(query);
console.log("Unread notifications count for user:", req.user?._id, "guestId:", guestId, "count:", count);
    res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error("COUNT error:", err);
    res.status(500).json({ success: false });
  }
});
router.get("/notifications-detail/:id", async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);

    if (!notif) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});
export default router;