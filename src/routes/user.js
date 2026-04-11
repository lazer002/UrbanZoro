import express from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";

const router = express.Router();
router.put("/update", async (req, res) => {
  try {
    const userId = req.user.id;

    const { name, phone, avatar } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 VALIDATION
    if (name && name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name too short",
      });
    }

    if (phone && phone.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔥 UPDATE FIELDS
    if (name) user.name = name.trim();
    if (phone) user.phone = phone;

    // 🔥 AVATAR (FROM SUPABASE URL)
    if (avatar) {
      // basic safety check
      if (!avatar.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "Invalid avatar URL",
        });
      }

      user.avatar = avatar;
    }

    user.lastLogin = new Date();

    await user.save();

    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
});


export default router;