import { Inventory } from "../models/Inventory.js";
import { Product } from "../models/Product.js";

export const decreaseInventory = async (
  productId,
  size,
  quantity = 1
) => {
  const qty = Number(quantity) || 1;

  const inventory = await Inventory.findOneAndUpdate(
    {
      product: productId,
      active: true,
      trackInventory: true,
      [`stock.${size}`]: { $gte: qty },
    },
    {
      $inc: {
        [`stock.${size}`]: -qty,
      },
    },
    {
      new: true,
    }
  );

  if (!inventory) {
    throw new Error(
      `Insufficient stock for size ${size}`
    );
  }

  await syncProductStockStatus(productId);

  return inventory;
};

export const increaseInventory = async (
  productId,
  size,
  quantity = 1
) => {
  const qty = Number(quantity) || 1;

  const inventory = await Inventory.findOneAndUpdate(
    {
      product: productId,
      active: true,
    },
    {
      $inc: {
        [`stock.${size}`]: qty,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!inventory) {
    throw new Error("Inventory not found");
  }

  await syncProductStockStatus(productId);

  return inventory;
};

export const syncProductStockStatus = async (productId) => {
  const inventory = await Inventory.findOne({
    product: productId,
    active: true,
  }).lean();

  if (!inventory) return null;

  const stock = inventory.stock || {};

  const totalStock = Object.values(stock).reduce(
    (total, qty) => total + Number(qty || 0),
    0
  );

  const isOutOfStock =
    inventory.trackInventory &&
    !inventory.allowBackorder &&
    totalStock <= 0;

  return Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        isOutOfStock,
      },
    },
    {
      new: true,
    }
  );
};

export const updateOrderInventory = async (
  order,
  mode = "decrease"
) => {
  const updateInventory =
    mode === "increase"
      ? increaseInventory
      : decreaseInventory;

  for (const item of order.items) {
    // Normal product
    if (item.productId) {
      await updateInventory(
        item.productId,
        item.variant,
        Number(item.quantity || 1)
      );
    }

    // Normal bundle / custom bundle
    if (item.bundleProducts?.length) {
      for (const bp of item.bundleProducts) {
        await updateInventory(
          bp.productId,
          bp.variant,
          Number(bp.quantity || 1) *
            Number(item.quantity || 1)
        );
      }
    }
  }
};