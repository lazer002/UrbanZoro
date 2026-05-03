import { Newsletter } from "../models/Newsletter.js";
import { requireAdmin } from "../middleware/auth.js";
import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existing = await Newsletter.findOne({ email });

    if (existing) {
      // already subscribed → reactivate if needed
      existing.subscribed = true;
      existing.unsubscribedAt = null;
      await existing.save();

      return res.json({
        success: true,
        message: "You're already subscribed 😎",
      });
    }

    await Newsletter.create({
      email,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Subscribed successfully 🎉",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});


router.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Newsletter.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    user.subscribed = false;
    user.unsubscribedAt = new Date();
    await user.save();

    res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const users = await Newsletter.find({ subscribed: true })
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

export default router;