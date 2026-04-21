import express from "express";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


// 🔥 ADD ADDRESS
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const { name, phone, address, city, state, zip, isDefault } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // if default → remove previous default
    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push({
      name,
      phone,
      address,
      city,
      state,
      zip,
      isDefault: !!isDefault,
    });

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Add address failed" });
  }
});


// 🔥 GET ALL ADDRESSES
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      addresses: user.addresses || [],
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch" });
  }
});


// 🔥 GET SINGLE ADDRESS
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({
      success: true,
      address,
    });
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});


// 🔥 UPDATE ADDRESS
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const addr = user.addresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ message: "Not found" });
    }

    Object.assign(addr, req.body);

    // handle default
    if (req.body.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
      addr.isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});


// 🔥 DELETE ADDRESS
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.addresses = user.addresses.filter(
      (a) => a._id.toString() !== req.params.id
    );

    await user.save();

    res.json({
      success: true,
      message: "Deleted",
    });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;