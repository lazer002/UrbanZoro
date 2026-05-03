import express from "express";
import { ProductRequest } from "../models/ProductRequest.js";
import { Product } from "../models/Product.js";
import { optionalAuth ,requireAdmin} from "../middleware/auth.js";

const router = express.Router();

router.post("/", optionalAuth, async (req, res) => {
  try {
    console.log(req.user)

    const { productId, email, size } = req.body;

    if (!productId || !email || !size) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ✅ if already in stock → no need to request
    const stock = product.inventory?.[size] ?? 0;
    if (stock > 0) {
      return res.status(400).json({
        error: "This size is already in stock",
      });
    }

    // ✅ prevent duplicate request (same email + size + product)
    const existing = await ProductRequest.findOne({
      productId,
      email,
      size,
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Already requested 😎",
      });
    }

    // ✅ create request
    const request = await ProductRequest.create({
      productId,
      email,
      size,
      user: req.user?.id || null,
    guestId: req.guestId  || null ,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "We’ll notify you when available 🚀",
      request,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const requests = await ProductRequest.find()
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const request = await ProductRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: "notified",
        notifiedAt: new Date(),
      },
      { new: true }
    );

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

export default router;