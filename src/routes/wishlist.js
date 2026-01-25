// routes/wishlist.js
import express from "express";
import {User} from "../models/User.js"; // ensure this is default export for your User model
import { requireAuth } from "../middleware/auth.js"; // sets req.userId or req.user

const router = express.Router();
function idsToStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(String);
}

// --- explicit routes first ---

// GET /api/wishlist
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select("wishlist").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ items: idsToStrings(user.wishlist || []) });
  } catch (err) {
    console.error("GET /wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/wishlist/add
router.post("/wishadd", requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const productId = req.body.productId || req.body.id;
    if (!productId) return res.status(400).json({ error: "Invalid productId" });

    await User.updateOne({ _id: userId }, { $addToSet: { wishlist: productId } });
    const user = await User.findById(userId).select("wishlist").lean();
    return res.json({ items: idsToStrings(user.wishlist || []) });
  } catch (err) {
    console.error("POST /wishlist/add error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/wishlist/remove
router.post("/wishremove", requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const productId = req.body.productId || req.body.id;
    if (!productId) return res.status(400).json({ error: "Invalid productId" });

    await User.updateOne({ _id: userId }, { $pull: { wishlist: productId } });
    const user = await User.findById(userId).select("wishlist").lean();
    return res.json({ items: idsToStrings(user.wishlist || []) });
  } catch (err) {
    console.error("POST /wishlist/remove error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/wishlist/sync
router.post("/sync", requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const items = Array.isArray(req.body.items) ? req.body.items.map(String) : [];
    if (items.length > 0) {
      await User.updateOne({ _id: userId }, { $addToSet: { wishlist: { $each: items } } });
    }

    const user = await User.findById(userId).select("wishlist").lean();
    return res.json({ items: idsToStrings(user.wishlist || []) });
  } catch (err) {
    console.error("POST /wishlist/sync error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- if you need a param route, add it after explicit routes ---
// e.g. GET /api/wishlist/item/:id  (not `/:id`)
router.get("/item/:id", requireAuth, async (req, res) => {
  // sample param route placed after explicit routes to avoid conflicts
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const itemId = req.params.id;
    // do something...
    return res.json({ ok: true, id: itemId });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});


export default router;
