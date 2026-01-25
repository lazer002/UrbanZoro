// routes/bundles.js
import express from "express";
import { Bundle } from "../models/Bundle.js";
import { Product } from "../models/Product.js";
const router = express.Router();

// Get all bundles (with optional category filter)
router.get("/", async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    const filter = { published: true };

    if (category) filter.category = category;

    const bundles = await Bundle.find(filter)
      .populate("products", "title price images")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Bundle.countDocuments(filter);
// console.log(bundles, 'bundles.length')
    res.json({ items: bundles, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single bundle by ID
router.get("/:id", async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id).populate(
      "products",
      "title price images"
    );
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });
    res.json(bundle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new bundle
router.post("/", async (req, res) => {
  try {
    // console.log(req.body, 'create bundle req.body');
    const { title, description, products, discount = 0, images = [], category } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    // Fetch product prices
    const productList = await Product.find({ _id: { $in: products } });
    const totalPrice = productList.reduce((sum, p) => sum + p.price, 0);

    // Apply discount
    const finalPrice = totalPrice - (totalPrice * discount) / 100;

    const newBundle = new Bundle({
      title,
      description,
      products,
      price: finalPrice,
      mainImages: images, // <-- use the frontend 'images' array
      category,
    });

    await newBundle.save();
    res.status(201).json(newBundle);
  } catch (err) {
    console.error("Error creating bundle:", err);
    res.status(500).json({ error: "Failed to create bundle" });
  }
});


// Update a bundle
// routes/bundles.js
router.put("/:id", async (req, res) => {
  try {
    console.log(req.body, 'update bundle req.body');
    const { title, description, products, mainImages, price, published, category } = req.body;

    const bundle = await Bundle.findById(req.params.id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });

    // Update fields manually
    if (title !== undefined) bundle.title = title;
    if (description !== undefined) bundle.description = description;
    if (products !== undefined) bundle.products = products;
    if (published !== undefined) bundle.published = published;
    if (category !== undefined) bundle.category = category;
    if (mainImages !== undefined && Array.isArray(mainImages)) bundle.mainImages = mainImages;
    if (price !== undefined) bundle.price = price; // manual price

    const updatedBundle = await bundle.save();
    res.json(updatedBundle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Delete a bundle
router.delete("/:id", async (req, res) => {
  try {
    await Bundle.findByIdAndDelete(req.params.id);
    res.json({ message: "Bundle deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
