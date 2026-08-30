import express from 'express'
import {Category}  from '../models/Category.js'
import { upload } from '../middleware/upload.js'
import { supabase } from '../config/supabase.js'
import dotenv from 'dotenv'
import { optionalAuth, requireAuth } from '../middleware/auth.js' // new middleware
import { Product } from '../models/Product.js'
import { Bundle } from "../models/Bundle.js";
dotenv.config()
const router = express.Router()

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({})
        res.json({ categories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})


router.post("/upload/image",optionalAuth,upload.single("file"),async (req, res) => {
    try {
      console.log("Upload request - user:", req.user);
      if (!req.file) {
        return res.status(400).json({ error: "No file" });
      }

  
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: "Invalid file type",
        });
      }

      // 🔥 size limit (1MB)
      if (req.file.size > 1 * 1024 * 1024) {
        return res.status(400).json({
          error: "File too large (max 1MB)",
        });
      }
      const userId = req.user?.id || null;          // ✅ from requireAuth
      const guestId = req.headers["x-guest-id"] || null; // ✅ from header
      // 🔥 naming (track owner)
      const fileExt = req.file.originalname.split(".").pop();
      const owner = userId || `guest-${guestId}`;
      const fileName = `${owner}-${Date.now()}.${fileExt}`;
      const path = `profile/${fileName}`;

      // 🔥 upload to supabase
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_PUBLIC)
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // 🔥 get public url
      const { data: pub } = supabase.storage
        .from(process.env.SUPABASE_BUCKET_PUBLIC)
        .getPublicUrl(data.path);

      return res.json({
        success: true,
        url: pub.publicUrl,
        path: data.path,
      });
    } catch (e) {
      console.error("Upload error:", e);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);


// GET /api/products/:publicId/related

router.get(
  "/products/:publicId/related",
  optionalAuth,
  async (req, res) => {
    try {
      const product = await Product.findOne({
        publicId: req.params.publicId,
      })
        .select("_id category")
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const products = await Product.find({
        _id: { $ne: product._id },
        category: product.category,
        active: true,
        published: true,
      })
        .select(
          "publicId title slug price oldPrice discount images category isOutOfStock"
        )
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();

      res.json({
        success: true,
        products,
      });
    } catch (error) {
      console.error(
        "GET RELATED PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch related products",
      });
    }
  }
);


// GET /api/bundles/:publicId/related

router.get(
  "/bundles/:publicId/related",
  optionalAuth,
  async (req, res) => {
    try {
      console.log('✌️publicId --->', req.params.publicId);
      const bundle = await Bundle.findOne({
        publicId: req.params.publicId,
      })
        .select("_id category")
        .lean();


      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      const bundles = await Bundle.find({
        _id: { $ne: bundle._id },
        category: bundle.category,
        active: true,
        published: true,
      })
        .select(
          "publicId title slug price oldPrice discount mainImages category onSale isNewBundle isOutOfStock"
        )
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();

      res.json({
        success: true,
        bundles,
      });
    } catch (error) {
      console.error(
        "GET RELATED BUNDLES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch related bundles",
      });
    }
  }
);


export default router