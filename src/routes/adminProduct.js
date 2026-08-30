import express from 'express'
import { Product } from '../models/Product.js'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js'
import { Category } from '../models/Category.js';
import { Inventory } from "../models/Inventory.js";
import {
  deleteSupabaseImages,
  
} from "../utils/helper.js";
const router = express.Router()


// GET /api/admin/products
router.get(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const products = await Product.find()
        .populate("category", "name slug photo")
        .sort({ createdAt: -1 })
        .lean();

      const productsWithInventory =
        await Promise.all(
          products.map(async (product) => {
            const inventory =
              await Inventory.findOne({
                product: product._id,
              }).lean();

            return {
              ...product,
              inventory: inventory || {
                product: product._id,
                sku: product.sku,
                stock: {},
                reserved: 0,
                lowStockThreshold: 5,
                trackInventory: true,
                allowBackorder: false,
                active: false,
              },
            };
          })
        );

      return res.json({
        success: true,
        products: productsWithInventory,
      });
    } catch (error) {
      console.error(
        "ADMIN GET PRODUCTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    console.log(req.body);

    const uploadedImages = Array.isArray(req.body.images)
      ? [...req.body.images]
      : [];

    let product = null;

    try {
      const productData = {
        ...req.body,
        isOutOfStock: true,
      };
      product = await Product.create(productData);

      const stock = {};

      for (const size of product.sizes || []) {
        const name =
          typeof size === "string"
            ? size
            : size.name;

        if (name) {
          stock[name] = 0;
        }
      }

      const inventory = await Inventory.create({
        product: product._id,
        sku: product.sku,
        stock,
        reserved: 0,
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorder: false,
        active: true,
      });

      return res.status(201).json({
        success: true,
        product,
        inventory,
      });
    } catch (error) {
      console.error(
        "CREATE PRODUCT ERROR:",
        error
      );

      // =========================
      // MONGO CLEANUP
      // =========================

      try {
        if (product?._id) {
          await Inventory.deleteOne({
            product: product._id,
          });

          await Product.deleteOne({
            _id: product._id,
          });
        }
      } catch (cleanupError) {
        console.error(
          "MONGO CLEANUP ERROR:",
          cleanupError
        );
      }

      // =========================
      // SUPABASE CLEANUP
      // =========================

      try {
        if (uploadedImages.length) {
          console.log(
            "ROLLING BACK IMAGES:",
            uploadedImages
          );

          await deleteSupabaseImages(
            uploadedImages
          );
        }
      } catch (cleanupError) {
        console.error(
          "SUPABASE CLEANUP ERROR:",
          cleanupError
        );
      }

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to create product",
      });
    }
  }
);

// Update Product
router.put(
  "/:productId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.productId,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Not found",
        });
      }

      // =========================
      // SKU
      // =========================

      if (req.body.sku) {
        await Inventory.findOneAndUpdate(
          { product: product._id },
          { sku: product.sku },
          { new: true }
        );
      }

      // =========================
      // INVENTORY
      // =========================

      if (
        req.body.inventory &&
        req.body.inventory.stock &&
        typeof req.body.inventory.stock === "object"
      ) {
        const stock = Object.fromEntries(
          Object.entries(req.body.inventory.stock).map(
            ([size, quantity]) => [
              size,
              Math.max(0, Number(quantity) || 0),
            ]
          )
        );

        await Inventory.findOneAndUpdate(
          { product: product._id },
          {
            $set: {
              stock,
              sku: product.sku,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        );

        const totalStock = Object.values(stock).reduce(
          (sum, quantity) =>
            sum + Number(quantity || 0),
          0
        );

        await Product.findByIdAndUpdate(
          product._id,
          {
            isOutOfStock: totalStock === 0,
          }
        );
      }

      // =========================
      // RETURN UPDATED DATA
      // =========================

      const updatedProduct =
        await Product.findById(product._id)
          .populate(
            "category",
            "name slug photo"
          )
          .lean();

      const inventory =
        await Inventory.findOne({
          product: product._id,
        }).lean();

      return res.json({
        success: true,
        product: {
          ...updatedProduct,
          inventory,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE PRODUCT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to update product",
      });
    }
  }
);

// Delete Product + Inventory

router.delete(
  "/:productId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const product = await Product.findById(
        req.params.productId
      );

      if (!product) {
        return res.status(404).json({
          error: "Not found",
        });
      }

      // Save images BEFORE deleting product
      const images = Array.isArray(product.images)
        ? [...product.images]
        : [];

      // Delete inventory
      await Inventory.findOneAndDelete({
        product: product._id,
      });

      // Delete Supabase images
      if (images.length) {
        await deleteSupabaseImages(images);
      }

      // Delete product
      await product.deleteOne();

      return res.json({
        success: true,
        ok: true,
      });
    } catch (error) {
      console.error(
        "DELETE PRODUCT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);



// admin pdp
router.get(
  "/:publicId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {

      const { publicId } = req.params;
      console.log('✌️publicId --->', publicId);


      const product = await Product.findOne({
        publicId,
      })
        .populate("category", "name slug photo")
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const inventory = await Inventory.findOne({
        product: product._id,
      })
        .lean();

      return res.json({
        success: true,
        product: {
          ...product,
          inventory: inventory || {
            product: product._id,
            stock: {},
            reserved: 0,
            lowStockThreshold: 5,
            trackInventory: true,
            allowBackorder: false,
            active: false,
          },
        },
      });
    } catch (error) {
      console.error(
        "ADMIN GET PRODUCT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);



// ADD IMAGES pdp
router.post(
  "/:productId/images",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { images } = req.body;

      if (
        !Array.isArray(images) ||
        !images.length
      ) {
        return res.status(400).json({
          success: false,
          error: "Images are required",
        });
      }

      const product =
        await Product.findByIdAndUpdate(
          req.params.productId,
          {
            $push: {
              images: {
                $each: images,
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            "category",
            "name slug photo"
          )
          .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      return res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error(
        "ADD PRODUCT IMAGES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);


// DELETE ONE IMAGE
router.delete(
  "/:productId/images",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Image URL is required",
        });
      }

      const product =
        await Product.findById(
          req.params.productId
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (!product.images?.includes(image)) {
        return res.status(404).json({
          success: false,
          error:
            "Image does not belong to this product",
        });
      }

      if (product.images.length <= 1) {
        return res.status(400).json({
          success: false,
          error:
            "Product must have at least one image",
        });
      }

      // Remove from MongoDB
      product.images =
        product.images.filter(
          (url) => url !== image
        );

      await product.save();

      // Delete ONLY this image from Supabase
      try {
        await deleteSupabaseImages([image]);
      } catch (supabaseError) {
        console.error(
          "SUPABASE IMAGE DELETE ERROR:",
          supabaseError
        );

        // MongoDB already changed.
        // Do not delete other images.
      }

      const updatedProduct =
        await Product.findById(
          product._id
        )
          .populate(
            "category",
            "name slug photo"
          )
          .lean();

      return res.json({
        success: true,
        product: updatedProduct,
      });
    } catch (error) {
      console.error(
        "DELETE PRODUCT IMAGE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);



export default router