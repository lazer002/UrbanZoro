import express from "express";
import { User } from "../models/User.js";
import { GuestUser } from "../models/GuestUser.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

/* =========================================================
   HELPER — GET CURRENT USER OR GUEST
========================================================= */

const getAddressOwner = async (req) => {
  // LOGGED-IN USER
  if (req.user?.id) {
    const user = await User.findById(req.user.id);

    if (!user) {
      return {
        owner: null,
        type: "user",
      };
    }

    return {
      owner: user,
      type: "user",
    };
  }

  // GUEST USER
  if (req.guestId) {
    const guest = await GuestUser.findOne({
      guestId: req.guestId,
    });

    if (!guest) {
      return {
        owner: null,
        type: "guest",
      };
    }

    return {
      owner: guest,
      type: "guest",
    };
  }

  return {
    owner: null,
    type: null,
  };
};

/* =========================================================
   ADD ADDRESS

   POST /api/address

   USER  -> User.addresses[]
   GUEST -> GuestUser.addresses[]
========================================================= */

router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      city,
      state,
      zip,
      isDefault,
    } = req.body;

    /* ---------- VALIDATION ---------- */

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone and address are required",
      });
    }

    /* ---------- GET OWNER ---------- */

    const { owner, type } =
      await getAddressOwner(req);

    if (!type) {
      return res.status(401).json({
        success: false,
        message:
          "User or guest identity required",
      });
    }

    if (!owner) {
      return res.status(404).json({
        success: false,
        message:
          type === "user"
            ? "User not found"
            : "Guest not found",
      });
    }

    /* ---------- ENSURE ADDRESS ARRAY ---------- */

    if (!owner.addresses) {
      owner.addresses = [];
    }

    /*
      First address automatically becomes default.

      Otherwise address becomes default only when
      isDefault === true.
    */

    const shouldBeDefault =
      owner.addresses.length === 0 ||
      isDefault === true;

    /* ---------- REMOVE OLD DEFAULT ---------- */

    if (shouldBeDefault) {
      owner.addresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    /* ---------- ADD ADDRESS ---------- */

    owner.addresses.push({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city?.trim() || "",
      state: state?.trim() || "",
      zip: zip?.trim() || "",
      isDefault: shouldBeDefault,
    });

    await owner.save();

    const newAddress =
      owner.addresses[
        owner.addresses.length - 1
      ];

    return res.status(201).json({
      success: true,
      type,
      address: newAddress,
      addresses: owner.addresses,
    });
  } catch (err) {
    console.error(
      "Add address error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Add address failed",
    });
  }
});

/* =========================================================
   GET ALL ADDRESSES

   GET /api/address
========================================================= */

router.get("/", optionalAuth, async (req, res) => {
  try {
    const { owner, type } =
      await getAddressOwner(req);

    if (!type) {
      return res.status(401).json({
        success: false,
        message:
          "User or guest identity required",
      });
    }

    if (!owner) {
      return res.status(404).json({
        success: false,
        message:
          type === "user"
            ? "User not found"
            : "Guest not found",
      });
    }

    return res.json({
      success: true,
      type,
      addresses: owner.addresses || [],
    });
  } catch (err) {
    console.error(
      "Fetch addresses error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch addresses",
    });
  }
});

/* =========================================================
   GET SINGLE ADDRESS

   GET /api/address/:id
========================================================= */

router.get(
  "/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const { owner, type } =
        await getAddressOwner(req);

      if (!type) {
        return res.status(401).json({
          success: false,
          message:
            "User or guest identity required",
        });
      }

      if (!owner) {
        return res.status(404).json({
          success: false,
          message:
            type === "user"
              ? "User not found"
              : "Guest not found",
        });
      }

      /* ---------- FIND ADDRESS ---------- */

      const address =
        owner.addresses?.id(req.params.id);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      return res.json({
        success: true,
        type,
        address,
      });
    } catch (err) {
      console.error(
        "Get address error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch address",
      });
    }
  }
);

/* =========================================================
   UPDATE ADDRESS

   PUT /api/address/:id
========================================================= */

router.put(
  "/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const { owner, type } =
        await getAddressOwner(req);

      if (!type) {
        return res.status(401).json({
          success: false,
          message:
            "User or guest identity required",
        });
      }

      if (!owner) {
        return res.status(404).json({
          success: false,
          message:
            type === "user"
              ? "User not found"
              : "Guest not found",
        });
      }

      /* ---------- FIND ADDRESS ---------- */

      const addr =
        owner.addresses?.id(req.params.id);

      if (!addr) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      const {
        name,
        phone,
        address,
        city,
        state,
        zip,
        isDefault,
      } = req.body;

      /* ---------- UPDATE FIELDS ---------- */

      if (name !== undefined) {
        addr.name = name.trim();
      }

      if (phone !== undefined) {
        addr.phone = phone.trim();
      }

      if (address !== undefined) {
        addr.address = address.trim();
      }

      if (city !== undefined) {
        addr.city = city.trim();
      }

      if (state !== undefined) {
        addr.state = state.trim();
      }

      if (zip !== undefined) {
        addr.zip = zip.trim();
      }

      /* ---------- SET DEFAULT ---------- */

      if (isDefault === true) {
        owner.addresses.forEach((item) => {
          item.isDefault = false;
        });

        addr.isDefault = true;
      }

      await owner.save();

      return res.json({
        success: true,
        type,
        address: addr,
        addresses: owner.addresses,
      });
    } catch (err) {
      console.error(
        "Update address error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Update failed",
      });
    }
  }
);

/* =========================================================
   DELETE ADDRESS

   DELETE /api/address/:id
========================================================= */

router.delete(
  "/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const { owner, type } =
        await getAddressOwner(req);

      if (!type) {
        return res.status(401).json({
          success: false,
          message:
            "User or guest identity required",
        });
      }

      if (!owner) {
        return res.status(404).json({
          success: false,
          message:
            type === "user"
              ? "User not found"
              : "Guest not found",
        });
      }

      /* ---------- FIND ADDRESS ---------- */

      const address =
        owner.addresses?.id(req.params.id);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      /* ---------- CHECK DEFAULT ---------- */

      const wasDefault =
        address.isDefault === true;

      /* ---------- DELETE ---------- */

      owner.addresses.pull(
        req.params.id
      );

      /*
        If deleted address was default,
        automatically make first remaining
        address default.
      */

      if (
        wasDefault &&
        owner.addresses.length > 0
      ) {
        owner.addresses[0].isDefault =
          true;
      }

      await owner.save();

      return res.json({
        success: true,
        type,
        message:
          "Address deleted successfully",
        addresses: owner.addresses,
      });
    } catch (err) {
      console.error(
        "Delete address error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }
);

export default router;