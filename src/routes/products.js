import express from 'express'
import { Product } from '../models/Product.js'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js'
import { Category } from '../models/Category.js';
import { Inventory } from "../models/Inventory.js";
import {
  deleteSupabaseImages,
  
} from "../utils/helper.js";
const router = express.Router()

router.get("/by-ids", async (req, res) => {
  try {
    const ids = req.query.ids?.split(",") || [];

    const validIds = ids.filter((id) =>
      /^[0-9a-fA-F]{24}$/.test(id)
    );

    if (!validIds.length) {
      return res.json({ items: [] });
    }

    const products = await Product.find({
      _id: { $in: validIds },
      published: true,
    });

    res.json({ items: products });
  } catch (err) {
    console.error("by-ids error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



router.get("/",optionalAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const {
      category,
      q,
      limit = 100,
      page = 1,
      sort = "newest",
      priceRange,
      color,
      size,
      fabric,
      fit,
      inStock,
      isNew,
      onSale,
    } = req.query;

    const filter = {
      published: true,
      active: true,
    };

    // CATEGORY
    if (category && category !== "All") {
      const normalizedCategory =
        category.toLowerCase().trim();

      const cat = await Category.findOne({
        $or: [
          {
            name: {
              $regex: `^${normalizedCategory}$`,
              $options: "i",
            },
          },
          {
            slug: {
              $regex: `^${normalizedCategory}$`,
              $options: "i",
            },
          },
        ],
      }).lean();

      filter.category = cat._id;
    }

    // SEARCH
    if (q?.trim()) {
      filter.title = {
        $regex: q.trim(),
        $options: "i",
      };
    }

    // PRICE
    if (priceRange) {
      switch (priceRange) {
        case "0-500":
          filter.price = {
            $gte: 0,
            $lte: 500,
          };
          break;

        case "500-1000":
          filter.price = {
            $gte: 500,
            $lte: 1000,
          };
          break;

        case "1000-2000":
          filter.price = {
            $gte: 1000,
            $lte: 2000,
          };
          break;

        case "2000+":
          filter.price = {
            $gte: 2000,
          };
          break;
      }
    }

    // COLOR
    if (color) {
      filter.colors = {
        $in: Array.isArray(color)
          ? color
          : [color],
      };
    }

    // SIZE
    if (size) {
      const sizes = Array.isArray(size)
        ? size
        : [size];

      filter["sizes.name"] = {
        $in: sizes,
      };
    }

    // FABRIC
    if (fabric) {
      filter.fabric = {
        $in: Array.isArray(fabric)
          ? fabric
          : [fabric],
      };
    }

    // FIT
    if (fit) {
      filter.fit = {
        $in: Array.isArray(fit)
          ? fit
          : [fit],
      };
    }

    // STOCK
    if (inStock === "true") {
      filter.isOutOfStock = false;
    }

    // SALE
    if (onSale === "true") {
      filter.onSale = true;
    }

    // NEW
    if (isNew === "true") {
      filter.isNewProduct = true;
    }

    // SORT
    let sortOption = {
      createdAt: -1,
    };

    if (sort === "low-high") {
      sortOption = {
        price: 1,
      };
    } else if (sort === "high-low") {
      sortOption = {
        price: -1,
      };
    } else if (sort === "popular") {
      sortOption = {
        sold: -1,
      };
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 100, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    // RUN COUNT + PRODUCTS IN PARALLEL
    const [total, products] =
      await Promise.all([
        Product.countDocuments(filter),

        Product.find(filter)
          .populate("category", "name slug")
          .sort(sortOption)
          .skip(skip)
          .limit(limitNumber)
          .lean(),
      ]);

    // INVENTORY
    const productIds = products.map(
      (product) => product._id
    );

    const inventories =
      productIds.length
        ? await Inventory.find({
            product: {
              $in: productIds,
            },
            active: true,
          })
            .select("product stock")
            .lean()
        : [];

    const inventoryMap = new Map(
      inventories.map((inventory) => [
        String(inventory.product),
        inventory.stock || {},
      ])
    );

    const items = products.map(
      (product) => ({
        ...product,

        inventory:
          inventoryMap.get(
            String(product._id)
          ) || {},
      })
    );


    console.log(items[0])
    return res.json({
      items,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    });
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/search",optionalAuth, async (req, res) => {
  try {
    console.log("Search query:", req.query);
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const regex = new RegExp(q, "i");

    const products = await Product.find({
      published: true,
      $or: [
        { title: regex },
        { category: regex },
        { description: regex },
      ],
    })
      .select("title price images category sku inventory") // return only essential fields
      .limit(20)
      .lean();

    if (products.length === 0) {
      return res.status(404).json({ message: "No matching products found" });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Search API error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// Create Product + Inventory

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
          error: "Not found",
        });
      }

      if (req.body.sku) {
        await Inventory.findOneAndUpdate(
          { product: product._id },
          { sku: product.sku },
          { new: true }
        );
      }

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error("UPDATE PRODUCT ERROR:", error);

      res.status(500).json({
        success: false,
        error: error.message,
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

// Public Get Product
router.get("/:publicId", async (req, res) => {
  try {
    const product = await Product.findOne({
      publicId: req.params.publicId,
      published: true,
      active: true,
    }).lean();

    if (!product) {
      return res.status(404).json({
        error: "Not found",
      });
    }

    const inventory = await Inventory.findOne({
      product: product._id,
      active: true,
    }).lean();

    res.json({
      ...product,
      inventory: inventory?.stock || {},
    });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    res.status(500).json({
      error: "Failed to fetch product",
    });
  }
});

export default router


