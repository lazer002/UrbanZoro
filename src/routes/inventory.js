// routes/inventory.js

import express from "express";
import { Inventory } from "../models/Inventory.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventories = await Inventory.find()
        .populate(
          "product",
          "_id title sku images category sizes"
        )
        .sort({ updatedAt: -1 });

      res.json({
        success: true,
        items: inventories,
      });
    } catch (error) {
      console.error("GET INVENTORY ERROR:", error);

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventory = await Inventory.findById(
        req.params.id
      ).populate(
        "product",
        "_id title sku images category sizes"
      );

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      res.json(inventory);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

router.get(
  "/product/:productId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventory =
        await Inventory.findOne({
          product: req.params.productId,
        }).populate(
          "product",
          "_id title sku images category sizes"
        );

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      res.json(inventory);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const existing =
        await Inventory.findOne({
          product: req.body.product,
        });

      if (existing) {
        return res.status(409).json({
          error: "Inventory already exists",
        });
      }

      const inventory =
        await Inventory.create({
          product: req.body.product,
          sku: req.body.sku,
          stock: {
            XS: Number(
              req.body.stock?.XS || 0
            ),
            S: Number(
              req.body.stock?.S || 0
            ),
            M: Number(
              req.body.stock?.M || 0
            ),
            L: Number(
              req.body.stock?.L || 0
            ),
            XL: Number(
              req.body.stock?.XL || 0
            ),
            XXL: Number(
              req.body.stock?.XXL || 0
            ),
          },
          reserved: Number(
            req.body.reserved || 0
          ),
          lowStockThreshold: Number(
            req.body.lowStockThreshold ?? 5
          ),
          trackInventory:
            req.body.trackInventory ?? true,
          allowBackorder:
            req.body.allowBackorder ?? false,
          active:
            req.body.active ?? true,
        });

      res.status(201).json({
        success: true,
        inventory,
      });
    } catch (error) {
      console.error(
        "CREATE INVENTORY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventory =
        await Inventory.findByIdAndUpdate(
          req.params.id,
          {
            $set: req.body,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      res.json({
        success: true,
        inventory,
      });
    } catch (error) {
      console.error(
        "UPDATE INVENTORY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.put(
  "/product/:productId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventory =
        await Inventory.findOneAndUpdate(
          {
            product: req.params.productId,
          },
          {
            $set: req.body,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      res.json({
        success: true,
        inventory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const inventory =
        await Inventory.findByIdAndDelete(
          req.params.id
        );

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

export default router;