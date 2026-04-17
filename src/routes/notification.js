import express from "express";
import { Notification } from "../models/Notification.js";
import { optionalAuth } from "../middleware/auth.js"; // ✅ use this

const router = express.Router();

/* =======================================================
   HELPER → GET OWNER QUERY
======================================================= */
function getOwnerQuery(req) {
  const userId = req.user?.id;
  const guestId = req.guestId || req.headers["x-guest-id"];

  if (userId) return { userId };
  if (guestId) return { guestId };

  return null;
}

/* =======================================================
   GET ALL NOTIFICATIONS
======================================================= */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    if (!query) {
      return res.json({ success: true, notifications: [] });
    }

    console.log("Fetching notifications:", query);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

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
   MARK ONE AS READ
======================================================= */
router.patch("/:id/read", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...query },
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
   MARK ALL AS READ
======================================================= */
router.patch("/read-all", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    if (!query) return res.json({ success: true });

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
router.delete("/:id", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    await Notification.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   UNREAD COUNT (BADGE 🔴)
======================================================= */
router.get("/unread-count", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    if (!query) {
      return res.json({ success: true, count: 0 });
    }

    const count = await Notification.countDocuments({
      ...query,
      read: false,
    });

    console.log("Unread notifications:", query, "count:", count);

    res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error("COUNT error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================================================
   GET SINGLE NOTIFICATION
======================================================= */
router.get("/notifications-detail/:id", optionalAuth, async (req, res) => {
  try {
    const query = getOwnerQuery(req);

    const notif = await Notification.findOne({
      _id: req.params.id,
      ...query,
    });

    if (!notif) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;