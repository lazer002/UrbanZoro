import express from "express";
import { Contact } from "../models/Contact.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Create contact message
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Message sent successfully",
      contact,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});




router.get("/", requireAdmin, async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});


router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { status, priority } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status, priority },
      { new: true }
    );

    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: "Failed to update contact" });
  }
});

export default router;