import express from "express";
import { User } from "../models/User.js";
import { Guest } from "../models/Guest.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

function idsToStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(String);
}

/* ================= HELPER ================= */

async function getWishlistOwner(req) {
  const userId = req.userId || req.user?.id;
  const guestId = req.headers["x-guest-id"];

  if (userId) {
    return {
      type: "user",
      doc: await User.findById(userId),
    };
  }

  if (guestId) {
    let guest = await Guest.findOne({ guestId });

    if (!guest) {
      guest = await Guest.create({ guestId, wishlist: [] });
    }

    return { type: "guest", doc: guest };
  }

  return null;
}

/* ================= GET ================= */

router.get("/", async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner) return res.status(401).json({ error: "Unauthorized" });

    return res.json({
      items: idsToStrings(owner.doc.wishlist || []),
    });
  } catch (err) {
    console.error("GET wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ================= ADD ================= */

router.post("/wishadd", async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner) return res.status(401).json({ error: "Unauthorized" });

    const productId = req.body.productId;
    if (!productId) return res.status(400).json({ error: "Invalid productId" });

    await owner.doc.updateOne({
      $addToSet: { wishlist: productId },
    });

    const updated = await owner.doc.constructor
      .findById(owner.doc._id)
      .select("wishlist")
      .lean();

    return res.json({ items: idsToStrings(updated.wishlist || []) });
  } catch (err) {
    console.error("ADD wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ================= REMOVE ================= */

router.post("/wishremove", async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner) return res.status(401).json({ error: "Unauthorized" });

    const productId = req.body.productId;
    if (!productId) return res.status(400).json({ error: "Invalid productId" });

    await owner.doc.updateOne({
      $pull: { wishlist: productId },
    });

    const updated = await owner.doc.constructor
      .findById(owner.doc._id)
      .select("wishlist")
      .lean();

    return res.json({ items: idsToStrings(updated.wishlist || []) });
  } catch (err) {
    console.error("REMOVE wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ================= SYNC (ONLY USER) ================= */

router.post("/sync", requireAuth,async (req, res) => {
  try {
  const guestId = req.headers["x-guest-id"];
  const userId = req.user?.id;

  if (userId) {
    const user = await User.findById(userId).select("wishlist");
    return res.json({ items: user?.wishlist || [] });
  }

  if (guestId) {
    const guest = await Guest.findOne({ guestId });
    return res.json({ items: guest?.wishlist || [] });
  }

  res.json({ items: [] });
  } catch (err) {
    console.error("SYNC error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;