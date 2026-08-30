import express from 'express'
import mongoose from "mongoose"
import { Product } from '../models/Product.js'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js'
import { Category } from '../models/Category.js';
import { Inventory } from "../models/Inventory.js";

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
console.log("req.query",req.query)
    const filter = {
      published: true,
      active: true,
    };

    // CATEGORY
if (category && category !== "All") {
  const normalizedCategory = category.toLowerCase().trim();

  const categoryConditions = [
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
  ];

  if (mongoose.Types.ObjectId.isValid(category)) {
    categoryConditions.unshift({
      _id: category,
    });
  }

  const cat = await Category.findOne({
    $or: categoryConditions,
  })
    .select("_id name slug")
    .lean();

  if (cat) {
    filter.category = cat._id;
  }
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


// Public Get Product
router.get("/:publicId",optionalAuth, async (req, res) => {
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


