import express from "express";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";

const router = express.Router();


router.get("/products", async (req, res) => {
  try {
    console.log("Search query:", req.query);
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const regex = new RegExp(q, "i");

    // Find matching categories
    const categories = await Category.find({ name: regex }).select("_id").lean();
    const categoryIds = categories.map(c => c._id);

    const products = await Product.find({
      published: true,
      $or: [
        { title: regex },
        { description: regex },
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
      ],
    })
      .select("title price images category sku") // return only essential fields
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



router.get("/filter", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, brand } = req.query;

    const filter = { published: true };

    if (category) filter.category = category;
    if (brand) filter.brand = brand; // You need to add a brand field in your schema if not present
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);

    const products = await Product.find(filter).limit(50).lean();

    if (!products.length) {
      return res.status(404).json({ error: "No matching products found" });
    }

    res.json(products);
  } catch (err) {
    console.error("Filter error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
