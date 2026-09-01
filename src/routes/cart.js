// cart.js

import express from "express";
import mongoose from "mongoose";

import { CartItem } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Inventory } from "../models/Inventory.js";
import { Bundle } from "../models/Bundle.js";

import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

function getCartOwner(req) {
  if (req.user?.id) {
    return {
      user: new mongoose.Types.ObjectId(String(req.user.id)),
    };
  }

  if (req.guestId) {
    return {
      guestId: String(req.guestId),
    };
  }

  return null;
}

function normalizePublicId(value) {
  if (value === undefined || value === null) return null;

  const id = String(value).trim();

  return id || null;
}

function normalizeSize(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function normalizeQuantity(value) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return null;
  }

  return quantity;
}

/* =========================================================
   PRODUCT
========================================================= */

async function findProductByPublicId(publicId) {
  const id = normalizePublicId(publicId);

  if (!id) return null;

  return Product.findOne({
    publicId: id,
    active: true,
    published: true,
  });
}

/* =========================================================
   BUNDLE
========================================================= */

async function findBundleByPublicId(publicId) {
  const id = normalizePublicId(publicId);

  if (!id) return null;

  return Bundle.findOne({
    publicId: id,
    active: {
      $ne: false,
    },
  });
}

/* =========================================================
   INVENTORY
========================================================= */

function mapStock(stock) {
  if (!stock) return {};

  if (stock instanceof Map) {
    return Object.fromEntries(
      [...stock.entries()].map(([key, value]) => [
        key,
        Number(value) || 0,
      ])
    );
  }

  if (typeof stock === "object") {
    return Object.fromEntries(
      Object.entries(stock).map(([key, value]) => [
        key,
        Number(value) || 0,
      ])
    );
  }

  return {};
}

function buildInventory(inventory) {
  if (!inventory) {
    return {
      stock: {},
      totalStock: 0,
      reserved: 0,
      available: Infinity,
      trackInventory: false,
      allowBackorder: false,
      lowStockThreshold: 0,
      active: false,
    };
  }

  const stock = mapStock(inventory.stock);

  const totalStock = Object.values(stock).reduce(
    (total, value) => total + Number(value || 0),
    0
  );

  const reserved = Number(inventory.reserved || 0);

  const available = inventory.trackInventory
    ? Math.max(0, totalStock - reserved)
    : Infinity;

  return {
    stock,
    // totalStock,
    // reserved,
    // available,
    // trackInventory: Boolean(inventory.trackInventory),
    // allowBackorder: Boolean(inventory.allowBackorder),
    // lowStockThreshold: Number(
    //   inventory.lowStockThreshold || 0
    // ),
    // active: Boolean(inventory.active),
  };
}

async function validateInventory({
  product,
  size,
  quantity,
}) {
  const inventory = await Inventory.findOne({
    product: product._id,
    active: true,
  }).lean();

  if (!inventory) {
    return {
      ok: true,
      inventory: null,
      available: Infinity,
    };
  }

  if (!inventory.trackInventory) {
    return {
      ok: true,
      inventory,
      available: Infinity,
    };
  }

  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];

  if (sizes.length) {
    if (!size) {
      return {
        ok: false,
        status: 400,
        error: "Please select a size",
      };
    }

    const validSize = sizes.some(
      (item) =>
        String(item.name).toLowerCase() ===
          String(size).toLowerCase() &&
        item.active !== false
    );

    if (!validSize) {
      return {
        ok: false,
        status: 400,
        error: "Invalid size",
      };
    }
  }

  const stock = mapStock(inventory.stock);

  const sizeStock =
    size !== null
      ? Number(stock[String(size)] || 0)
      : Object.values(stock).reduce(
          (total, value) =>
            total + Number(value || 0),
          0
        );

  const reserved = Number(inventory.reserved || 0);

  const available = Math.max(
    0,
    sizeStock - reserved
  );

  if (
    available < quantity &&
    !inventory.allowBackorder
  ) {
    return {
      ok: false,
      status: 400,
      error:
        available <= 0
          ? "Product is out of stock"
          : `Only ${available} available`,
    };
  }

  return {
    ok: true,
    inventory,
    available,
  };
}

/* =========================================================
   PRODUCT RESPONSE
========================================================= */

async function makeProductCartData(publicId) {
  const product =
    await findProductByPublicId(publicId);

  if (!product) return null;

  const inventory =
    await Inventory.findOne({
      product: product._id,
      active: true,
    }).lean();

  return {
    publicId: product.publicId,
    sku: product.sku || null,
    title: product.title || null,
    description: product.description || null,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount,
    currency: product.currency,
    images: product.images || [],
    sizes: product.sizes || [],
    category: product.category || null,
    tags: product.tags || [],
    active: product.active,
    published: product.published,
    onSale: product.onSale,
    isNewProduct: product.isNewProduct,
    featured: product.featured,
    slug: product.slug || null,
    inventory: buildInventory(inventory),
  };
}

/* =========================================================
   CART RESPONSE
========================================================= */

async function populateCartItem(item) {
  const data = item.toObject();

  /*
   * PRODUCT
   */
  if (data.type === "product" && data.publicId) {
    const product =
      await makeProductCartData(
        data.publicId
      );

    return {
      ...data,
      product,
    };
  }

  /*
   * BUNDLE
   */
  if (
    data.type === "bundle" &&
    Array.isArray(data.bundleProducts)
  ) {
    const bundleProducts =
      await Promise.all(
        data.bundleProducts.map(
          async (bundleProduct) => {
            const product =
              await makeProductCartData(
                bundleProduct.publicId
              );

            return {
              publicId:
                bundleProduct.publicId,

              sku:
                bundleProduct.sku ||
                product?.sku ||
                null,

              title:
                bundleProduct.title ||
                product?.title ||
                null,

              image:
                bundleProduct.image ||
                product?.images?.[0] ||
                null,

              size:
                bundleProduct.size ||
                null,

              quantity:
                Number(
                  bundleProduct.quantity || 1
                ),

              inventory:
                product?.inventory || null,
            };
          }
        )
      );

    let bundle = data.bundle || null;

    /*
     * PREBUILT BUNDLE
     */
    if (
      !data.isCustomBundle &&
      data.bundle?.publicId
    ) {
      const dbBundle =
        await findBundleByPublicId(
          data.bundle.publicId
        );

      if (dbBundle) {
        bundle = {
          publicId:
            dbBundle.publicId,

          title:
            dbBundle.title ||
            data.bundle.title ||
            null,

          price:
            dbBundle.price ??
            data.bundle.price ??
            0,

          oldPrice:
            dbBundle.oldPrice ?? 0,

          images:
            dbBundle.images ||
            dbBundle.mainImages ||
            [],
        };
      }
    }

    return {
      ...data,
      bundle,
      bundleProducts,
    };
  }

  return data;
}

/* =========================================================
   GET CART
========================================================= */

async function getCartItems(owner) {
  const items =
    await CartItem.find(owner)
      .sort({
        createdAt: -1,
      });

  /*
   * Delete old/broken documents.
   */
  const brokenIds =
    items
      .filter((item) => {
        if (item.type === "product") {
          return !item.publicId;
        }

        if (item.type === "bundle") {
          return (
            !item.bundle &&
            !Array.isArray(item.bundleProducts)
          );
        }

        return true;
      })
      .map((item) => item._id);

  if (brokenIds.length) {
    await CartItem.deleteMany({
      ...owner,
      _id: {
        $in: brokenIds,
      },
    });
  }

  const validItems =
    items.filter((item) => {
      if (item.type === "product") {
        return Boolean(item.publicId);
      }

      if (item.type === "bundle") {
        return (
          Boolean(item.bundle?.title) &&
          Array.isArray(item.bundleProducts) &&
          item.bundleProducts.length > 0
        );
      }

      return false;
    });

  return Promise.all(
    validItems.map(populateCartItem)
  );
}

/* =========================================================
   GET
========================================================= */

router.get(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.json({
          success: true,
          items: [],
        });
      }

      const items =
        await getCartItems(owner);

      return res.json({
        success: true,
        items,
      });
    } catch (error) {
      console.error(
        "GET CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/* =========================================================
   ADD PRODUCT
========================================================= */

router.post(
  "/add",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const publicId =
        normalizePublicId(
          req.body.publicId
        );

      const size =
        normalizeSize(
          req.body.size
        );

      const quantity =
        normalizeQuantity(
          req.body.quantity ?? 1
        );

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error:
            "publicId is required",
        });
      }

      if (!quantity) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid quantity",
        });
      }

      const product =
        await findProductByPublicId(
          publicId
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          error:
            "Product not found",
        });
      }

      const inventoryCheck =
        await validateInventory({
          product,
          size,
          quantity,
        });

      if (!inventoryCheck.ok) {
        return res.status(
          inventoryCheck.status
        ).json({
          success: false,
          error:
            inventoryCheck.error,
        });
      }

      /*
       * IMPORTANT:
       * Cart stores publicId.
       * No product ObjectId.
       */
      const filter = {
        ...owner,
        type: "product",
        publicId: product.publicId,
        size,
      };

      let item =
        await CartItem.findOne(
          filter
        );

      if (item) {
        const nextQuantity =
          Number(item.quantity || 0) +
          quantity;

        const nextCheck =
          await validateInventory({
            product,
            size,
            quantity:
              nextQuantity,
          });

        if (!nextCheck.ok) {
          return res.status(
            nextCheck.status
          ).json({
            success: false,
            error:
              nextCheck.error,
          });
        }

        item.quantity =
          nextQuantity;

        await item.save();
      } else {
        item =
          new CartItem({
            ...owner,

            type: "product",

            publicId:
              product.publicId,

            sku:
              product.sku || null,

            title:
              product.title || null,

            mainImage:
              product.images?.[0] ||
              null,

            size,

            quantity,
          });

        await item.save();
      }

      const response =
        await populateCartItem(
          item
        );

      return res.json({
        success: true,
        message:
          "Added to cart",
        item: response,
      });
    } catch (error) {
      console.error(
        "ADD CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to add to cart",
      });
    }
  }
);

/* =========================================================
   UPDATE PRODUCT
========================================================= */

router.post(
  "/update",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const publicId =
        normalizePublicId(
          req.body.publicId
        );

      const size =
        normalizeSize(
          req.body.size
        );

      const quantity =
        normalizeQuantity(
          req.body.quantity
        );

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error:
            "publicId is required",
        });
      }

      if (!quantity) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid quantity",
        });
      }

      const product =
        await findProductByPublicId(
          publicId
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          error:
            "Product not found",
        });
      }

      const check =
        await validateInventory({
          product,
          size,
          quantity,
        });

      if (!check.ok) {
        return res.status(
          check.status
        ).json({
          success: false,
          error: check.error,
        });
      }

      const item =
        await CartItem.findOne({
          ...owner,
          type: "product",
          publicId:
            product.publicId,
          size,
        });

      if (!item) {
        return res.status(404).json({
          success: false,
          error:
            "Cart item not found",
        });
      }

      item.quantity =
        quantity;

      await item.save();

      return res.json({
        success: true,
        message:
          "Cart updated",
        item:
          await populateCartItem(
            item
          ),
      });
    } catch (error) {
      console.error(
        "UPDATE CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to update cart",
      });
    }
  }
);

/* =========================================================
   REMOVE PRODUCT / BUNDLE
========================================================= */

router.post(
  "/remove",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const publicId =
        normalizePublicId(
          req.body.publicId
        );

      const size =
        normalizeSize(
          req.body.size
        );

      const bundlePublicId =
        normalizePublicId(
          req.body.bundlePublicId
        );

      const cartItemId =
        req.body.cartItemId;

      /*
       * PRODUCT
       */
      if (publicId) {
        const result =
          await CartItem.findOneAndDelete({
            ...owner,
            type: "product",
            publicId,
            size,
          });

        if (!result) {
          return res.status(404).json({
            success: false,
            error:
              "Cart item not found",
          });
        }

        return res.json({
          success: true,
          message:
            "Product removed from cart",
        });
      }

      /*
       * BUNDLE
       *
       * cartItemId works for BOTH
       * custom and prebuilt bundles.
       */
      if (cartItemId) {
        const result =
          await CartItem.findOneAndDelete({
            ...owner,
            _id: cartItemId,
            type: "bundle",
          });

        if (!result) {
          return res.status(404).json({
            success: false,
            error:
              "Bundle not found in cart",
          });
        }

        return res.json({
          success: true,
          message:
            "Bundle removed from cart",
        });
      }

      /*
       * PREBUILT BUNDLE
       */
      if (bundlePublicId) {
        const result =
          await CartItem.findOneAndDelete({
            ...owner,
            type: "bundle",
            isCustomBundle: false,
            "bundle.publicId":
              bundlePublicId,
          });

        if (!result) {
          return res.status(404).json({
            success: false,
            error:
              "Bundle not found in cart",
          });
        }

        return res.json({
          success: true,
          message:
            "Bundle removed from cart",
        });
      }

      return res.status(400).json({
        success: false,
        error:
          "publicId, cartItemId or bundlePublicId is required",
      });
    } catch (error) {
      console.error(
        "REMOVE CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to remove cart item",
      });
    }
  }
);

/* =========================================================
   CLEAR
========================================================= */

router.post(
  "/clear",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const result =
        await CartItem.deleteMany(
          owner
        );

      return res.json({
        success: true,
        message:
          "Cart cleared",
        deletedCount:
          result.deletedCount,
      });
    } catch (error) {
      console.error(
        "CLEAR CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to clear cart",
      });
    }
  }
);

/* =========================================================
   ADD BUNDLE
========================================================= */

router.post(
  "/addbundle",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const isCustomBundle =
        Boolean(
          req.body.isCustomBundle
        );

      const bundle =
        req.body.bundle || {};

      const bundlePublicId =
        normalizePublicId(
          bundle.publicId
        );

      const bundleProducts =
        Array.isArray(
          req.body.bundleProducts
        )
          ? req.body.bundleProducts
          : [];

      const quantity =
        normalizeQuantity(
          req.body.quantity ?? 1
        );

      /*
       * PREBUILT
       */
      if (
        !isCustomBundle &&
        !bundlePublicId
      ) {
        return res.status(400).json({
          success: false,
          error:
            "bundle.publicId is required",
        });
      }

      /*
       * CUSTOM
       */
      if (
        isCustomBundle &&
        !bundle.title
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Custom bundle title is required",
        });
      }

      if (!bundleProducts.length) {
        return res.status(400).json({
          success: false,
          error:
            "bundleProducts are required",
        });
      }

      if (!quantity) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid quantity",
        });
      }

      /*
       * Resolve every product using publicId.
       */
      const resolvedProducts = [];

      for (
        const bundleProduct of
          bundleProducts
      ) {
        const publicId =
          normalizePublicId(
            bundleProduct.publicId
          );

        const size =
          normalizeSize(
            bundleProduct.size
          );

        const productQuantity =
          normalizeQuantity(
            bundleProduct.quantity ?? 1
          );

        if (!publicId) {
          return res.status(400).json({
            success: false,
            error:
              "Bundle product publicId is required",
          });
        }

        if (!productQuantity) {
          return res.status(400).json({
            success: false,
            error:
              "Invalid bundle product quantity",
          });
        }

        const product =
          await findProductByPublicId(
            publicId
          );

        if (!product) {
          return res.status(404).json({
            success: false,
            error:
              `Product not found: ${publicId}`,
          });
        }

        const check =
          await validateInventory({
            product,
            size,
            quantity:
              productQuantity *
              quantity,
          });

        if (!check.ok) {
          return res.status(
            check.status
          ).json({
            success: false,
            error:
              `${product.title}: ${check.error}`,
          });
        }

        resolvedProducts.push({
          publicId:
            product.publicId,

          sku:
            product.sku || null,

          title:
            product.title || null,

          image:
            product.images?.[0] ||
            null,

          size,

          quantity:
            productQuantity,
        });
      }

      /*
       * Resolve prebuilt bundle.
       */
      let finalBundle = {
        publicId:
          null,

        title:
          bundle.title ||
          "Custom Bundle",

        price:
          Number(bundle.price || 0),

        mainImage:
          bundle.mainImage ||
          resolvedProducts[0]?.image ||
          null,
      };

      if (!isCustomBundle) {
        const dbBundle =
          await findBundleByPublicId(
            bundlePublicId
          );

        if (!dbBundle) {
          return res.status(404).json({
            success: false,
            error:
              "Bundle not found",
          });
        }

        finalBundle = {
          publicId:
            dbBundle.publicId,

          title:
            dbBundle.title || null,

          price:
            Number(dbBundle.price || 0),

          mainImage:
            dbBundle.images?.[0] ||
            dbBundle.mainImages?.[0] ||
            bundle.mainImage ||
            null,
        };
      }

      /*
       * Signature makes custom/prebuilt
       * bundles behave consistently.
       */
      const newSignature =
        resolvedProducts
          .map(
            (item) =>
              `${item.publicId}:${item.size || ""}:${item.quantity}`
          )
          .sort()
          .join("|");

      const existingItems =
        await CartItem.find({
          ...owner,
          type: "bundle",
          isCustomBundle,
        });

      const existing =
        existingItems.find(
          (item) => {
            /*
             * Prebuilt:
             * same bundle publicId
             */
            if (!isCustomBundle) {
              return (
                item.bundle?.publicId ===
                finalBundle.publicId
              );
            }

            /*
             * Custom:
             * same products + sizes
             */
            const signature =
              (item.bundleProducts || [])
                .map(
                  (product) =>
                    `${product.publicId}:${product.size || ""}:${product.quantity}`
                )
                .sort()
                .join("|");

            return (
              signature ===
              newSignature
            );
          }
        );

      /*
       * Existing bundle.
       */
      if (existing) {
        existing.quantity =
          Number(
            existing.quantity || 0
          ) + quantity;

        await existing.save();

        return res.json({
          success: true,
          message:
            "Bundle quantity updated",
          item:
            await populateCartItem(
              existing
            ),
        });
      }

      /*
       * New bundle.
       */
      const item =
        new CartItem({
          ...owner,

          type: "bundle",

          isCustomBundle,

          bundle:
            finalBundle,

          bundleProducts:
            resolvedProducts,

          quantity,
        });

      await item.save();

      return res.json({
        success: true,
        message:
          "Bundle added to cart",
        item:
          await populateCartItem(
            item
          ),
      });
    } catch (error) {
      console.error(
        "ADD BUNDLE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to add bundle",
      });
    }
  }
);

/* =========================================================
   UPDATE BUNDLE
========================================================= */

router.post(
  "/updatebundle",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const cartItemId =
        req.body.cartItemId;

      const quantity =
        normalizeQuantity(
          req.body.quantity
        );

      if (!cartItemId) {
        return res.status(400).json({
          success: false,
          error:
            "cartItemId is required",
        });
      }

      if (!quantity) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid quantity",
        });
      }

      const item =
        await CartItem.findOne({
          ...owner,
          _id: cartItemId,
          type: "bundle",
        });

      if (!item) {
        return res.status(404).json({
          success: false,
          error:
            "Bundle not found in cart",
        });
      }

      /*
       * Validate inventory for the
       * new bundle quantity.
       */
      for (
        const bundleProduct of
          item.bundleProducts || []
      ) {
        const product =
          await findProductByPublicId(
            bundleProduct.publicId
          );

        if (!product) {
          return res.status(404).json({
            success: false,
            error:
              `Product not found: ${bundleProduct.publicId}`,
          });
        }

        const check =
          await validateInventory({
            product,
            size:
              bundleProduct.size,
            quantity:
              Number(
                bundleProduct.quantity || 1
              ) * quantity,
          });

        if (!check.ok) {
          return res.status(
            check.status
          ).json({
            success: false,
            error:
              `${product.title}: ${check.error}`,
          });
        }
      }

      item.quantity =
        quantity;

      await item.save();

      return res.json({
        success: true,
        message:
          "Bundle updated",
        item:
          await populateCartItem(
            item
          ),
      });
    } catch (error) {
      console.error(
        "UPDATE BUNDLE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to update bundle",
      });
    }
  }
);

/* =========================================================
   REMOVE BUNDLE
========================================================= */

router.post(
  "/removebundle",
  optionalAuth,
  async (req, res) => {
    try {
      const owner =
        getCartOwner(req);

      if (!owner) {
        return res.status(400).json({
          success: false,
          error:
            "Missing user or guestId",
        });
      }

      const cartItemId =
        req.body.cartItemId;

      if (!cartItemId) {
        return res.status(400).json({
          success: false,
          error:
            "cartItemId is required",
        });
      }

      const result =
        await CartItem.findOneAndDelete({
          ...owner,
          _id: cartItemId,
          type: "bundle",
        });

      if (!result) {
        return res.status(404).json({
          success: false,
          error:
            "Bundle not found in cart",
        });
      }

      return res.json({
        success: true,
        message:
          "Bundle removed from cart",
      });
    } catch (error) {
      console.error(
        "REMOVE BUNDLE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to remove bundle",
      });
    }
  }
);

/* =========================================================
   MERGE GUEST CART
========================================================= */

router.post(
  "/merge",
  requireAuth,
  async (req, res) => {
    try {
      const guestId =
        normalizePublicId(
          req.body.guestId
        );

      if (!guestId) {
        return res.status(400).json({
          success: false,
          error:
            "guestId is required",
        });
      }

      const userId =
        new mongoose.Types.ObjectId(
          String(req.user.id)
        );

      const guestItems =
        await CartItem.find({
          guestId,
        });

      for (
        const guestItem of
          guestItems
      ) {
        /*
         * PRODUCT
         */
        if (
          guestItem.type ===
          "product"
        ) {
          const existing =
            await CartItem.findOne({
              user: userId,
              type: "product",
              publicId:
                guestItem.publicId,
              size:
                guestItem.size,
            });

          if (existing) {
            existing.quantity =
              Number(
                existing.quantity || 0
              ) +
              Number(
                guestItem.quantity || 1
              );

            await existing.save();
          } else {
            await CartItem.create({
              user: userId,

              type: "product",

              publicId:
                guestItem.publicId,

              sku:
                guestItem.sku ||
                null,

              title:
                guestItem.title ||
                null,

              mainImage:
                guestItem.mainImage ||
                null,

              size:
                guestItem.size ||
                null,

              quantity:
                Number(
                  guestItem.quantity || 1
                ),
            });
          }

          continue;
        }

        /*
         * BUNDLE
         */
        if (
          guestItem.type ===
          "bundle"
        ) {
          const isCustom =
            Boolean(
              guestItem.isCustomBundle
            );

          const existingItems =
            await CartItem.find({
              user: userId,
              type: "bundle",
              isCustomBundle:
                isCustom,
            });

          let existing = null;

          /*
           * PREBUILT
           */
          if (!isCustom) {
            existing =
              existingItems.find(
                (item) =>
                  item.bundle?.publicId ===
                  guestItem.bundle?.publicId
              );
          }

          /*
           * CUSTOM
           */
          else {
            const guestSignature =
              (guestItem.bundleProducts ||
                [])
                .map(
                  (product) =>
                    `${product.publicId}:${product.size || ""}:${product.quantity}`
                )
                .sort()
                .join("|");

            existing =
              existingItems.find(
                (item) => {
                  const signature =
                    (item.bundleProducts ||
                      [])
                      .map(
                        (product) =>
                          `${product.publicId}:${product.size || ""}:${product.quantity}`
                      )
                      .sort()
                      .join("|");

                  return (
                    signature ===
                    guestSignature
                  );
                }
              );
          }

          if (existing) {
            existing.quantity =
              Number(
                existing.quantity || 0
              ) +
              Number(
                guestItem.quantity || 1
              );

            await existing.save();
          } else {
            const data =
              guestItem.toObject();

            delete data._id;
            delete data.guestId;
            delete data.user;
            delete data.createdAt;
            delete data.updatedAt;

            data.user =
              userId;

            await CartItem.create(
              data
            );
          }
        }
      }

      await CartItem.deleteMany({
        guestId,
      });

      const items =
        await getCartItems({
          user: userId,
        });

      return res.json({
        success: true,
        items,
      });
    } catch (error) {
      console.error(
        "MERGE CART ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to merge guest cart",
      });
    }
  }
);

export default router;