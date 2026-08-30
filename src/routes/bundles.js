// routes/bundles.js

import express from "express";
import { Bundle } from "../models/Bundle.js";
import { Product } from "../models/Product.js";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth.js";

import {
  deleteSupabaseImages,

} from "../utils/helper.js";
const router = express.Router();

/* =========================
   GET ALL BUNDLES
========================= */

router.get("/",optionalAuth, async (req, res) => {
  try {
    const {
      category,
      limit = 10,
      page = 1,
      q,
      onSale,
      isNewBundle,
      featured,
    } = req.query;

    const filter = {
      published: true,
      active: true,
    };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (q?.trim()) {
      filter.$or = [
        {
          title: {
            $regex: q.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: q.trim(),
            $options: "i",
          },
        },
        {
          tags: {
            $regex: q.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (onSale === "true") {
      filter.onSale = true;
    }

    if (isNewBundle === "true") {
      filter.isNewBundle = true;
    }

    if (featured === "true") {
      filter.featured = true;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const [bundles, total] = await Promise.all([
      Bundle.find(filter)
        .populate(
          "products",
          "publicId title price oldPrice images sizes isOutOfStock active published"
        )
        .sort({ createdAt: -1 })
        .skip(
          (pageNumber - 1) * limitNumber
        )
        .limit(limitNumber)
        .lean(),

      Bundle.countDocuments(filter),
    ]);

    res.json({
      items: bundles,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    });
  } catch (error) {
    console.error(
      "GET BUNDLES ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


/* =========================
   GET SINGLE BUNDLE
========================= */

router.get("/:publicId",optionalAuth, async (req, res) => {
  try {
    console.log(req.params.publicId)
    const bundle = await Bundle.findOne({
      publicId: req.params.publicId,
      published: true,
      active: true,
    })
      .populate(
        "products",
        "publicId title price oldPrice images sizes isOutOfStock active published"
      )
      .lean();

    if (!bundle) {
      return res.status(404).json({
        message: "Bundle not found",
      });
    }

    res.json(bundle);
  } catch (error) {
    console.error("GET BUNDLE ERROR:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


/* =========================
   CREATE BUNDLE
========================= */
router.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    let bundle = null;

    try {
      console.log(req.body);

      const {
        title,
        description,
        products,
        category,
        price,
        oldPrice,
        discount,
        currency,
        mainImages,
        tags,
        active,
        published,
        featured,
        isNewBundle,
        onSale,
        isOutOfStock,
      } = req.body;

      if (
        !title?.trim() ||
        !Array.isArray(products) ||
        products.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Title and at least one product are required",
        });
      }

      const productList =
        await Product.find({
          _id: {
            $in: products,
          },
          active: true,
        }).select(
          "_id title price isOutOfStock"
        );

      if (
        productList.length !==
        products.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more products are invalid",
        });
      }

      const calculatedOldPrice =
        productList.reduce(
          (sum, product) =>
            sum + Number(product.price || 0),
          0
        );

      const finalOldPrice =
        oldPrice !== undefined
          ? Number(oldPrice)
          : calculatedOldPrice;

      const finalPrice =
        price !== undefined
          ? Number(price)
          : finalOldPrice;

      const calculatedDiscount =
        finalOldPrice > finalPrice &&
        finalOldPrice > 0
          ? Math.round(
              ((finalOldPrice -
                finalPrice) /
                finalOldPrice) *
                100
            )
          : 0;

      const hasOutOfStockProduct =
        productList.some(
          (product) =>
            product.isOutOfStock === true
        );

      bundle = await Bundle.create({
        title: title.trim(),

        description:
          description?.trim() || "",

        products,

        category:
          category?.trim() || "",

        price: finalPrice,

        oldPrice: finalOldPrice,

        discount:
          discount !== undefined
            ? Number(discount)
            : calculatedDiscount,

        currency: currency || "INR",

        mainImages:
          Array.isArray(mainImages)
            ? mainImages
            : [],

        tags:
          Array.isArray(tags)
            ? tags
            : [],

        active: active ?? true,

        published: published ?? true,

        featured: featured ?? false,

        isNewBundle:
          isNewBundle ?? false,

        onSale:
          onSale ??
          calculatedDiscount > 0,

        isOutOfStock:
          isOutOfStock ??
          hasOutOfStockProduct,
      });

      const populatedBundle =
        await Bundle.findById(
          bundle._id
        ).populate(
          "products",
          "title price oldPrice images sizes isOutOfStock"
        );

      return res.status(201).json({
        success: true,
        bundle: populatedBundle,
      });
    } catch (error) {
      console.error(
        "CREATE BUNDLE ERROR:",
        error
      );

      // Mongo cleanup
      try {
        if (bundle?._id) {
          await Bundle.deleteOne({
            _id: bundle._id,
          });
        }
      } catch (cleanupError) {
        console.error(
          "BUNDLE MONGO CLEANUP ERROR:",
          cleanupError
        );
      }

      // Supabase cleanup
      try {
        await deleteSupabaseImages(
          getUploadedImages(req.body)
        );
      } catch (cleanupError) {
        console.error(
          "BUNDLE IMAGE CLEANUP ERROR:",
          cleanupError
        );
      }

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to create bundle",
      });
    }
  }
);

/* =========================
   UPDATE BUNDLE
========================= */

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundle =
        await Bundle.findById(
          req.params.id
        );

      if (!bundle) {
        return res.status(404).json({
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
        published,
        active,
        category,
        tags,
        featured,
        isNewBundle,
        onSale,
        isOutOfStock,
      } = req.body;

      if (title !== undefined) {
        bundle.title =
          title.trim();
      }

      if (
        description !== undefined
      ) {
        bundle.description =
          description.trim();
      }

      if (products !== undefined) {
        if (
          !Array.isArray(products) ||
          products.length === 0
        ) {
          return res.status(400).json({
            message:
              "At least one product is required",
          });
        }

        const productList =
          await Product.find({
            _id: {
              $in: products,
            },
            active: true,
          }).select(
            "_id price isOutOfStock"
          );

        if (
          productList.length !==
          products.length
        ) {
          return res.status(400).json({
            message:
              "One or more products are invalid",
          });
        }

        bundle.products =
          products;

        if (
          price === undefined &&
          oldPrice === undefined
        ) {
          bundle.oldPrice =
            productList.reduce(
              (sum, product) =>
                sum +
                Number(
                  product.price || 0
                ),
              0
            );
        }

        if (
          isOutOfStock === undefined
        ) {
          bundle.isOutOfStock =
            productList.some(
              (product) =>
                product.isOutOfStock ===
                true
            );
        }
      }

      if (
        mainImages !== undefined &&
        Array.isArray(mainImages)
      ) {
        bundle.mainImages =
          mainImages;
      }

      if (price !== undefined) {
        bundle.price =
          Number(price);
      }

      if (
        oldPrice !== undefined
      ) {
        bundle.oldPrice =
          Number(oldPrice);
      }

      if (
        category !== undefined
      ) {
        bundle.category =
          category.trim();
      }

      if (tags !== undefined) {
        bundle.tags =
          Array.isArray(tags)
            ? tags
            : [];
      }

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

      const finalOldPrice =
        Number(
          bundle.oldPrice || 0
        );

      const finalPrice =
        Number(
          bundle.price || 0
        );

      bundle.discount =
        finalOldPrice > finalPrice &&
        finalOldPrice > 0
          ? Math.round(
              ((finalOldPrice -
                finalPrice) /
                finalOldPrice) *
                100
            )
          : 0;

      bundle.onSale =
        bundle.discount > 0;

      const updatedBundle =
        await bundle.save();

      const populatedBundle =
        await Bundle.findById(
          updatedBundle._id
        ).populate(
          "products",
          "title price oldPrice images sizes isOutOfStock active published"
        );

      res.json({
        success: true,
        bundle: populatedBundle,
      });
    } catch (error) {
      console.error(
        "UPDATE BUNDLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


/* =========================
   DELETE BUNDLE
========================= */

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const bundle = await Bundle.findById(
        req.params.id
      );

      if (!bundle) {
        return res.status(404).json({
          success: false,
          message: "Bundle not found",
        });
      }

      const images = Array.isArray(
        bundle.mainImages
      )
        ? [...bundle.mainImages]
        : [];

      // Delete MongoDB first
      await bundle.deleteOne();

      // Delete Supabase images
      try {
        if (images.length) {
          await deleteSupabaseImages(images);
        }
      } catch (imageError) {
        console.error(
          "BUNDLE IMAGE DELETE ERROR:",
          imageError
        );
      }

      return res.json({
        success: true,
        message:
          "Bundle deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE BUNDLE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

export default router;