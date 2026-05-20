import express from "express";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";

const router = express.Router();


router.get("/products", async (req, res) => {

  try {

    const q = req.query.q?.trim();

    if (!q || q.length < 2) {
      return res.status(200).json([]);
    }

    // FIND CATEGORY IDS
    const matchingCategories =
      await Category.find(
        {
          name: {
            $regex: q,
            $options: "i",
          },
        }
      )
      .select("_id")
      .lean();

    const categoryIds =
      matchingCategories.map(
        c => c._id
      );

    // PRODUCT SEARCH
    const products = await Product.find(
      {
        published: true,

        $or: [

          {
            $text: {
              $search: q,
            },
          },

          ...(categoryIds.length
            ? [
                {
                  category: {
                    $in: categoryIds,
                  },
                },
              ]
            : []),
        ],
      },

      {
        score: {
          $meta: "textScore",
        },

        title: 1,
        price: 1,
        images: 1,
        category: 1,
        sku: 1,
        inventory: 1,
        onSale: 1,
      }
    )

      .sort({
        score: {
          $meta: "textScore",
        },
      })

      .limit(20)

      .lean();

    return res.status(200).json(products);

  } catch (error) {

    console.error(
      "Search API error:",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });

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
