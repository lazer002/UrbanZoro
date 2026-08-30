// routes/adminBundles.js

import express from "express";
import { Bundle } from "../models/Bundle.js";
import { Product } from "../models/Product.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.js";
import { Inventory } from "../models/Inventory.js";

import { deleteSupabaseImages } from "../utils/helper.js";

const router = express.Router();


// =====================================================
// GET ALL BUNDLES
// GET /api/admin/bundles
// =====================================================

router.get(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundles = await Bundle.find()
        .populate(
          "products",
          "publicId title price oldPrice images sizes category sku slug active published isOutOfStock"
        )
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        bundles,
      });
    } catch (error) {
      console.error(
        "GET ADMIN BUNDLES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch bundles",
        error: error.message,
      });
    }
  }
);


// =====================================================
// GET ONE BUNDLE
// GET /api/admin/bundles/:publicId
// =====================================================

router.get(
  "/:publicId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundle = await Bundle.findOne({
        publicId: req.params.publicId,
      })
        .populate({
          path: "products",
          select:
            "_id publicId title price oldPrice images sizes category sku slug active published isOutOfStock",
        })
        .lean();

      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      const productIds = (bundle.products || []).map(
        (product) => product._id
      );

      const inventories = await Inventory.find({
        product: { $in: productIds },
      })
        .select("product sku stock")
        .lean();

      const inventoryMap = new Map(
        inventories.map((inventory) => [
          String(inventory.product),
          inventory,
        ])
      );

      const productsWithInventory = (
        bundle.products || []
      ).map((product) => ({
        ...product,
        inventory:
          inventoryMap.get(String(product._id)) || null,
      }));

      return res.json({
        success: true,
        bundle: {
          ...bundle,
          products: productsWithInventory,
        },
      });
    } catch (error) {
      console.error(
        "GET ADMIN BUNDLE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch bundle",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE BUNDLE
// PUT /api/admin/bundles/:publicId
// =====================================================

router.put(
  "/:publicId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundle =
        await Bundle.findOne({
          publicId:
            req.params.publicId,
        });

      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      const {
        title,
        description,
        products,
        mainImages,
        price,
        oldPrice,
        currency,
        published,
        active,
        featured,
        isNewBundle,
        onSale,
        isOutOfStock,
        tags,
        category,
      } = req.body;


      // -------------------------
      // BASIC DATA
      // -------------------------

      if (title !== undefined) {
        bundle.title =
          String(title).trim();
      }

      if (
        description !== undefined
      ) {
        bundle.description =
          String(description);
      }

      if (currency !== undefined) {
        bundle.currency =
          String(currency);
      }

      if (price !== undefined) {
        bundle.price =
          Number(price) || 0;
      }

      if (
        oldPrice !== undefined
      ) {
        bundle.oldPrice =
          Number(oldPrice) || 0;
      }


      // -------------------------
      // IMAGES
      // -------------------------

      if (
        mainImages !== undefined
      ) {
        if (
          !Array.isArray(
            mainImages
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "mainImages must be an array",
          });
        }

        bundle.mainImages =
          mainImages;
      }


      // -------------------------
      // PRODUCTS
      // -------------------------

      if (products !== undefined) {
        if (
          !Array.isArray(products)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "products must be an array",
          });
        }

        const validProducts =
          await Product.find({
            _id: {
              $in: products,
            },
          }).select("_id");

        if (
          validProducts.length !==
          products.length
        ) {
          return res.status(400).json({
            success: false,
            message:
              "One or more products are invalid",
          });
        }

        bundle.products =
          products;
      }


      // -------------------------
      // FLAGS
      // -------------------------

      if (
        published !== undefined
      ) {
        bundle.published =
          Boolean(published);
      }

      if (
        active !== undefined
      ) {
        bundle.active =
          Boolean(active);
      }

      if (
        featured !== undefined
      ) {
        bundle.featured =
          Boolean(featured);
      }

      if (
        isNewBundle !== undefined
      ) {
        bundle.isNewBundle =
          Boolean(isNewBundle);
      }

      if (
        onSale !== undefined
      ) {
        bundle.onSale =
          Boolean(onSale);
      }

      if (
        isOutOfStock !== undefined
      ) {
        bundle.isOutOfStock =
          Boolean(isOutOfStock);
      }

      if (tags !== undefined) {
        bundle.tags =
          Array.isArray(tags)
            ? tags
            : [];
      }

      if (
        category !== undefined
      ) {
        bundle.category =
          String(category);
      }


      // -------------------------
      // DISCOUNT
      // -------------------------

      if (
        bundle.oldPrice > 0 &&
        bundle.price <
          bundle.oldPrice
      ) {
        bundle.discount =
          Number(
            (
              ((bundle.oldPrice -
                bundle.price) /
                bundle.oldPrice) *
              100
            ).toFixed(2)
          );
      } else {
        bundle.discount = 0;
      }


      await bundle.save();


      // -------------------------
      // RETURN POPULATED
      // -------------------------

      const updated =
        await Bundle.findOne({
          publicId:
            req.params.publicId,
        })
          .populate(
            "products",
            "publicId title price oldPrice images sizes category sku slug active published isOutOfStock inventory"
          )
          .lean();

      res.json({
        success: true,
        bundle: updated,
      });
    } catch (error) {
      console.error(
        "UPDATE ADMIN BUNDLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to update bundle",
        error: error.message,
      });
    }
  }
);


// =====================================================
// DELETE BUNDLE
// DELETE /api/admin/bundles/:publicId
// =====================================================

router.delete(
  "/:publicId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundle =
        await Bundle.findOne({
          publicId:
            req.params.publicId,
        });

      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      await bundle.deleteOne();

      res.json({
        success: true,
        message:
          "Bundle deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE ADMIN BUNDLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to delete bundle",
        error: error.message,
      });
    }
  }
);





router.delete(
  "/:publicId/images",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { publicId } = req.params;
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          message: "Image URL is required",
        });
      }

      const bundle = await Bundle.findOne({
        publicId,
      });

      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      const images = Array.isArray(
        bundle.mainImages
      )
        ? bundle.mainImages
        : [];

      if (images.length <= 1) {
        return res.status(400).json({
          success: false,
          message:
            "Bundle must have at least one image",
        });
      }

      if (!images.includes(image)) {
        return res.status(404).json({
          success: false,
          message: "Image not found in bundle",
        });
      }

      // Remove from Supabase first
      await deleteSupabaseImages([image]);

      // Remove from MongoDB
      bundle.mainImages = images.filter(
        (item) => item !== image
      );

      await bundle.save();

      return res.json({
        success: true,
        message: "Bundle image deleted",
        bundle,
      });
    } catch (error) {
      console.error(
        "DELETE BUNDLE IMAGE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete bundle image",
        error: error.message,
      });
    }
  }
);

export default router;