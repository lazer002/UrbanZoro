import express from "express";
import crypto from "crypto";
import { upload } from "../middleware/upload.js";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const BUCKET = process.env.SUPABASE_BUCKET || "product-images";

router.post(
  "/images",
  requireAuth,
  requireAdmin,
  upload.array("files", 10),
  async (req, res) => {
    try {
      if (!req.files?.length) {
        return res.status(400).json({
          success: false,
          error: "No files",
        });
      }

      const images = await Promise.all(
        req.files.map(async (file) => {
          const ext =
            file.originalname
              ?.split(".")
              .pop()
              ?.toLowerCase() || "webp";

          const path = `products/${crypto.randomUUID()}.${ext}`;

          const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file.buffer, {
              contentType: file.mimetype,
              cacheControl: "31536000",
              upsert: false,
            });

          if (error) {
            throw new Error(
              `${file.originalname}: ${error.message}`
            );
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(data.path);

          return {
            url: publicUrl,
            path: data.path,
          };
        })
      );

      return res.status(200).json({
        success: true,
        images,
      });
    } catch (error) {
      console.error("BATCH UPLOAD ERROR:", error);

      return res.status(500).json({
        success: false,
        error: error.message || "Upload failed",
      });
    }
  }
);

export default router;