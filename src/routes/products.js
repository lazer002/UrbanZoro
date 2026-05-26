import express from 'express'
import { Product } from '../models/Product.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { Category } from '../models/Category.js';

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



router.get("/", async (req, res) => {

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

    // FILTER OBJECT
    const filter = {
      published: true,
    };

    /*
    ========================
    CATEGORY
    ========================
    */

    if (
      category &&
      category !== "All"
    ) {

      const isObjectId =
        /^[0-9a-fA-F]{24}$/.test(
          category
        );

      if (isObjectId) {

        filter.category = category;

      } else {

        const cat =
          await Category.findOne({
            $or: [
              {
                name: {
                  $regex: `^${category}$`,
                  $options: "i",
                },
              },
              {
                slug: {
                  $regex: `^${category}$`,
                  $options: "i",
                },
              },
            ],
          });

        if (cat) {
          filter.category = cat._id;
        }

      }

    }

    /*
    ========================
    SEARCH
    ========================
    */

    if (q) {

      filter.title = {
        $regex: q,
        $options: "i",
      };

    }

    /*
    ========================
    PRICE RANGE
    ========================
    */

    if (priceRange) {

      if (priceRange === "0-500") {

        filter.price = {
          $gte: 0,
          $lte: 500,
        };

      }

      else if (
        priceRange === "500-1000"
      ) {

        filter.price = {
          $gte: 500,
          $lte: 1000,
        };

      }

      else if (
        priceRange === "1000-2000"
      ) {

        filter.price = {
          $gte: 1000,
          $lte: 2000,
        };

      }

      else if (
        priceRange === "2000+"
      ) {

        filter.price = {
          $gte: 2000,
        };

      }

    }

    /*
    ========================
    COLOR
    ========================
    */

    if (color) {

      filter.colors = {
        $in: Array.isArray(color)
          ? color
          : [color],
      };

    }

    /*
    ========================
    SIZE
    ========================
    */

    if (size) {

      filter.sizes = {
        $in: Array.isArray(size)
          ? size
          : [size],
      };

    }

    /*
    ========================
    FABRIC
    ========================
    */

    if (fabric) {

      filter.fabric = {
        $in: Array.isArray(fabric)
          ? fabric
          : [fabric],
      };

    }

    /*
    ========================
    FIT
    ========================
    */

    if (fit) {

      filter.fit = {
        $in: Array.isArray(fit)
          ? fit
          : [fit],
      };

    }

    /*
    ========================
    STOCK
    ========================
    */

    if (inStock === "true") {

      filter.stock = {
        $gt: 0,
      };

    }

    /*
    ========================
    SALE
    ========================
    */

    if (onSale === "true") {

      filter.onSale = true;

    }

    /*
    ========================
    NEW ARRIVALS
    ========================
    */

    if (isNew === "true") {

      filter.isNewProduct = true;

    }

    /*
    ========================
    SORTING
    ========================
    */

    let sortOption = {
      createdAt: -1,
    };

    if (sort === "low-high") {

      sortOption = {
        price: 1,
      };

    }

    else if (
      sort === "high-low"
    ) {

      sortOption = {
        price: -1,
      };

    }

    else if (
      sort === "popular"
    ) {

      sortOption = {
        sold: -1,
      };

    }

    /*
    ========================
    TOTAL COUNT
    ========================
    */

    const total =
      await Product.countDocuments(
        filter
      );

    /*
    ========================
    PRODUCTS
    ========================
    */

    const products =
      await Product.find(filter)

        .populate(
          "category",
          "name slug"
        )

        .sort(sortOption)

        .skip(
          (Number(page) - 1) *
          Number(limit)
        )

        .limit(Number(limit));

    /*
    ========================
    RESPONSE
    ========================
    */

    return res.json({

      items: products,

      total,

      currentPage:
        Number(page),

      totalPages: Math.ceil(
        total / Number(limit)
      ),

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });

  }

});

router.get("/search", async (req, res) => {
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


// Admin CRUD
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  console.log(req.body)
  const product = await Product.create(req.body)
  res.status(201).json(product)
})

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  console.log(req.body)
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})


router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  console.log(req.body)
  const product = await Product.findById(req.params.id)
  if (!product || !product.published) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})


export default router


