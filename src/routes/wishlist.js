import express from "express";
import { User } from "../models/User.js";
import { Guest } from "../models/Guest.js";
import { Product } from "../models/Product.js";
import {
  requireAuth,
  optionalAuth,
} from "../middleware/auth.js";

const router = express.Router();

/* =====================================================
   HELPERS
===================================================== */

function idsToStrings(arr) {
  if (!Array.isArray(arr)) return [];

  return arr
    .map(String)
    .filter(Boolean);
}

async function getWishlistOwner(req) {
  const userId = req.user?.id;
  const guestId = req.headers["x-guest-id"];

  if (!userId && !guestId) {
    throw new Error("No user or guest");
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
      guest = await Guest.create({
        guestId,
        wishlist: [],
      });
    }

    return {
      type: "guest",
      doc: guest,
    };
  }

  return null;
}

/*
 * Convert stored wishlist IDs to publicIds.
 *
 * Existing User wishlist may contain Mongo _ids.
 * New wishlist values should be publicIds.
 */
async function normalizeWishlistToPublicIds(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  const values = idsToStrings(items);

  const objectIds = values.filter((id) =>
    /^[a-f\d]{24}$/i.test(id)
  );

  const publicIds = values.filter(
    (id) => !/^[a-f\d]{24}$/i.test(id)
  );

  if (!objectIds.length) {
    return [...new Set(publicIds)];
  }

  const products = await Product.find({
    _id: { $in: objectIds },
  })
    .select("_id publicId")
    .lean();

  const objectIdToPublicId = new Map(
    products.map((product) => [
      String(product._id),
      String(product.publicId),
    ])
  );

  const normalized = values
    .map((id) => {
      if (objectIdToPublicId.has(id)) {
        return objectIdToPublicId.get(id);
      }

      return id;
    })
    .filter(Boolean);

  return [...new Set(normalized)];
}

/* =====================================================
   GET WISHLIST
===================================================== */

router.get(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        await getWishlistOwner(req);

      if (!owner?.doc) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const items =
        await normalizeWishlistToPublicIds(
          owner.doc.wishlist || []
        );

      /*
       * Automatically migrate old User wishlist
       * from Mongo _id → publicId.
       */
      if (
        owner.type === "user" &&
        JSON.stringify(items) !==
          JSON.stringify(
            idsToStrings(
              owner.doc.wishlist || []
            )
          )
      ) {
        owner.doc.wishlist = items;
        await owner.doc.save();
      }

      return res.json({
        items,
      });
    } catch (err) {
      console.error(
        "GET wishlist error",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

/* =====================================================
   ADD WISHLIST
===================================================== */

router.post(
  "/wishadd",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        await getWishlistOwner(req);

      if (!owner?.doc) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const productId =
        String(req.body.productId || "").trim();

      if (!productId) {
        return res.status(400).json({
          error: "Product ID is required",
        });
      }

      /*
       * IMPORTANT:
       * Frontend now sends publicId.
       */
      const product =
        await Product.findOne({
          publicId: productId,
          active: true,
        })
          .select("publicId")
          .lean();

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      const publicId =
        String(product.publicId);

      const current =
        await normalizeWishlistToPublicIds(
          owner.doc.wishlist || []
        );

      if (!current.includes(publicId)) {
        current.push(publicId);
      }

      owner.doc.wishlist = [
        ...new Set(current),
      ];

      await owner.doc.save();

      return res.json({
        items: owner.doc.wishlist,
      });
    } catch (err) {
      console.error(
        "ADD wishlist error",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

/* =====================================================
   REMOVE WISHLIST
===================================================== */

router.post(
  "/wishremove",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        await getWishlistOwner(req);

      if (!owner?.doc) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const productId =
        String(req.body.productId || "").trim();

      if (!productId) {
        return res.status(400).json({
          error: "Product ID is required",
        });
      }

      const current =
        await normalizeWishlistToPublicIds(
          owner.doc.wishlist || []
        );

      owner.doc.wishlist =
        current.filter(
          (id) => id !== productId
        );

      await owner.doc.save();

      return res.json({
        items: owner.doc.wishlist,
      });
    } catch (err) {
      console.error(
        "REMOVE wishlist error",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

/* =====================================================
   SYNC GUEST → USER
===================================================== */

router.post(
  "/sync",
  requireAuth,
  async (req, res) => {
    try {
      const guestId = req.headers["x-guest-id"];
      const userId = req.user?.id;

      console.log("========== WISHLIST SYNC ==========");
      console.log("guestId:", guestId);
      console.log("userId:", userId);

      const user = await User.findById(userId);

      console.log(
        "USER WISHLIST:",
        user?.wishlist
      );

      const guest = guestId
        ? await Guest.findOne({ guestId })
        : null;

      console.log(
        "GUEST FOUND:",
        !!guest
      );

      console.log(
        "GUEST ID:",
        guest?.guestId
      );

      console.log(
        "GUEST WISHLIST:",
        guest?.wishlist
      );

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      let existingWishlist =
        Array.isArray(user.wishlist)
          ? user.wishlist.map(String)
          : [];

      let guestWishlist =
        Array.isArray(guest?.wishlist)
          ? guest.wishlist.map(String)
          : [];

      console.log(
        "EXISTING:",
        existingWishlist
      );

      console.log(
        "GUEST:",
        guestWishlist
      );

      if (guestWishlist.length) {
        const products =
          await Product.find({
            publicId: {
              $in: guestWishlist,
            },
            active: true,
          })
            .select("publicId")
            .lean();

        console.log(
          "MATCHED PRODUCTS:",
          products
        );

        const validPublicIds =
          new Set(
            products.map((p) =>
              String(p.publicId)
            )
          );

        guestWishlist =
          guestWishlist.filter((id) =>
            validPublicIds.has(id)
          );
      }

      console.log(
        "VALID GUEST:",
        guestWishlist
      );

      const merged = [
        ...new Set([
          ...existingWishlist,
          ...guestWishlist,
        ]),
      ];

      console.log(
        "FINAL MERGED:",
        merged
      );

      user.wishlist = merged;

      await user.save();

      if (guestId) {
        await Guest.deleteOne({
          guestId,
        });
      }

      return res.json({
        success: true,
        items: merged,
      });
    } catch (err) {
      console.error(
        "SYNC wishlist error:",
        err
      );

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

export default router;