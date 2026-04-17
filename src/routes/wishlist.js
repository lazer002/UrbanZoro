import express from "express";
import { User } from "../models/User.js";
import { Guest } from "../models/Guest.js";
import { requireAuth,optionalAuth } from "../middleware/auth.js";
const router = express.Router();
import mongoose from "mongoose";

function idsToStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(String);
}

/* ================= HELPER ================= */

async function getWishlistOwner(req) {
  const userId = req.user?.id;
  const guestId = req.headers["x-guest-id"];

  console.log("Determining wishlist owner:", { userId, guestId });

  if (!userId && !guestId) {
    throw new Error("No user or guest"); // 🔥 debug catch
  }

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

router.get("/",optionalAuth, async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner) return res.status(401).json({ error: "Unauthorized" });

    console.log("Wishlist owner found:", { type: owner.type, id: owner.doc._id });
    return res.json({
      items: idsToStrings(owner.doc.wishlist || []),
    });
  } catch (err) {
    console.error("GET wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ================= ADD ================= */

router.post("/wishadd", optionalAuth, async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner?.doc) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const productId = req.body.productId;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const updated = await owner.doc.constructor.findByIdAndUpdate(
      owner.doc._id,
      { $addToSet: { wishlist: productId } },
      { new: true, select: "wishlist" }
    );

    return res.json({
      items: idsToStrings(updated?.wishlist || []),
    });

  } catch (err) {
    console.error("ADD wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});
/* ================= REMOVE ================= */

router.post("/wishremove", optionalAuth, async (req, res) => {
  try {
    const owner = await getWishlistOwner(req);
    if (!owner?.doc) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const productId = req.body.productId;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const updated = await owner.doc.constructor.findByIdAndUpdate(
      owner.doc._id,
      { $pull: { wishlist: productId } },
      { new: true, select: "wishlist" }
    );

    return res.json({
      items: idsToStrings(updated?.wishlist || []),
    });

  } catch (err) {
    console.error("REMOVE wishlist error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ================= SYNC (ONLY USER) ================= */

router.post("/sync", requireAuth, async (req, res) => {
  try {
    const guestId = req.headers["x-guest-id"];
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔥 merge guest wishlist
    if (guestId) {
      const guest = await Guest.findOne({ guestId });

      if (guest && guest.wishlist?.length) {
        user.wishlist = [
          ...new Set([
            ...(user.wishlist || []),
            ...guest.wishlist,
          ]),
        ];

        await user.save();

        console.log("✅ Wishlist merged");

        // 🔥 clear guest
        await Guest.deleteOne({ guestId });
      }
    }

    return res.json({
      items: user.wishlist || [],
    });

  } catch (err) {
    console.error("SYNC error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;