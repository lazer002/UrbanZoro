import express from "express";

import { requireAuth, requireAdmin } from "../middleware/auth.js";

import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

const router = express.Router();

const VALID_RANGES = [7, 30, 90];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getRangeStart = (days) => {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() - (days - 1));
  return date;
};

const buildDateRange = (days) => {
  const start = getRangeStart(days);
  const dates = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    dates.push({
      date,
      key: date.toISOString().slice(0, 10),
    });
  }

  return dates;
};

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const requestedRange = Number(req.query.range || 30);

    const days = VALID_RANGES.includes(requestedRange)
      ? requestedRange
      : 30;

    const now = new Date();
    const rangeStart = getRangeStart(days);

    /*
    |--------------------------------------------------------------------------
    | BASIC COUNTS
    |--------------------------------------------------------------------------
    */

    const [
      users,
      products,
      orders,
      paidOrders,
      pendingPayments,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
    ] = await Promise.all([
      User.countDocuments({}),

      Product.countDocuments({}),

      Order.countDocuments({}),

      Order.countDocuments({
        paymentStatus: "paid",
      }),

      Order.countDocuments({
        paymentStatus: "pending",
      }),

      Order.countDocuments({
        orderStatus: "delivered",
      }),

      Order.countDocuments({
        orderStatus: "cancelled",
      }),

      Order.countDocuments({
        orderStatus: {
          $in: [
            "return requested",
            "return approved",
            "returned",
            "refunded",
          ],
        },
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | RANGE ORDER COUNT
    |--------------------------------------------------------------------------
    */

    const rangeOrderCount = await Order.countDocuments({
      createdAt: {
        $gte: rangeStart,
        $lte: now,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | GROSS SALES
    |
    | Includes all orders.
    |--------------------------------------------------------------------------
    */

    const grossRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
          orderStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$total",
          },
          subtotal: {
            $sum: "$subtotal",
          },
          shipping: {
            $sum: "$shippingFee",
          },
          discount: {
            $sum: "$couponDiscount",
          },
          orders: {
            $sum: 1,
          },
        },
      },
    ]);

    const grossRevenue = grossRevenueResult[0] || {
      total: 0,
      subtotal: 0,
      shipping: 0,
      discount: 0,
      orders: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | PAID REVENUE
    |--------------------------------------------------------------------------
    */

    const paidRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
          paymentStatus: "paid",
          orderStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$total",
          },
          subtotal: {
            $sum: "$subtotal",
          },
          orders: {
            $sum: 1,
          },
        },
      },
    ]);

    const paidRevenue = paidRevenueResult[0] || {
      total: 0,
      subtotal: 0,
      orders: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | DAILY REVENUE
    |--------------------------------------------------------------------------
    */

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
          orderStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          revenue: {
            $sum: "$total",
          },

          paidRevenue: {
            $sum: {
              $cond: [
                {
                  $eq: ["$paymentStatus", "paid"],
                },
                "$total",
                0,
              ],
            },
          },

          orders: {
            $sum: 1,
          },

          paidOrders: {
            $sum: {
              $cond: [
                {
                  $eq: ["$paymentStatus", "paid"],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const revenueMap = new Map(
      dailyRevenue.map((item) => [
        item._id,
        {
          revenue: Number(item.revenue || 0),
          paidRevenue: Number(item.paidRevenue || 0),
          orders: Number(item.orders || 0),
          paidOrders: Number(item.paidOrders || 0),
        },
      ])
    );

    const revenueData = buildDateRange(days).map(
      ({ key, date }) => {
        const item = revenueMap.get(key) || {
          revenue: 0,
          paidRevenue: 0,
          orders: 0,
          paidOrders: 0,
        };

        return {
          date: key,

          label: date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),

          revenue: item.revenue,

          paidRevenue: item.paidRevenue,

          orders: item.orders,

          paidOrders: item.paidOrders,
        };
      }
    );

    /*
    |--------------------------------------------------------------------------
    | ORDER STATUS
    |--------------------------------------------------------------------------
    */

    const orderStatusData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
        },
      },

      {
        $group: {
          _id: "$orderStatus",

          count: {
            $sum: 1,
          },

          revenue: {
            $sum: "$total",
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS
    |--------------------------------------------------------------------------
    */

    const paymentStatusData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
        },
      },

      {
        $group: {
          _id: "$paymentStatus",

          count: {
            $sum: 1,
          },

          amount: {
            $sum: "$total",
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | FULFILLMENT
    |--------------------------------------------------------------------------
    */

    const fulfillmentData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
        },
      },

      {
        $group: {
          _id: "$fulfillmentStatus",

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | SALES SOURCE
    |--------------------------------------------------------------------------
    */

    const sourceData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },
        },
      },

      {
        $group: {
          _id: "$source",

          count: {
            $sum: 1,
          },

          revenue: {
            $sum: "$total",
          },
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | TOP PRODUCTS
    |
    | Normal products + products inside bundles/custom bundles.
    |--------------------------------------------------------------------------
    */

    const topProductsResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },

          orderStatus: {
            $ne: "cancelled",
          },
        },
      },

      {
        $unwind: "$items",
      },

      {
        $group: {
          _id: {
            productId: "$items.productId",
            title: "$items.title",
          },

          quantity: {
            $sum: "$items.quantity",
          },

          revenue: {
            $sum: "$items.total",
          },

          orders: {
            $sum: 1,
          },

          image: {
            $first: "$items.mainImage",
          },
        },
      },

      {
        $sort: {
          quantity: -1,
          revenue: -1,
        },
      },

      {
        $limit: 10,
      },
    ]);

    const topProducts = topProductsResult.map((item) => ({
      productId: item._id?.productId || null,

      title: item._id?.title || "Unknown Product",

      quantity: Number(item.quantity || 0),

      unitsSold: Number(item.quantity || 0),

      revenue: Number(item.revenue || 0),

      orders: Number(item.orders || 0),

      image: item.image || null,

      thumbnail: item.image || null,
    }));

    /*
    |--------------------------------------------------------------------------
    | TOP CATEGORIES
    |--------------------------------------------------------------------------
    */

   const topCategories = await Order.aggregate([
  {
    $match: {
      createdAt: {
        $gte: rangeStart,
        $lte: now,
      },
      orderStatus: {
        $ne: "cancelled",
      },
    },
  },

  {
    $unwind: "$items",
  },

  {
    $match: {
      "items.productId": {
        $exists: true,
        $ne: null,
      },
    },
  },

  {
    $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      as: "product",
    },
  },

  {
    $unwind: {
      path: "$product",
      preserveNullAndEmptyArrays: true,
    },
  },

  {
    $group: {
      _id: "$product.category",

      quantity: {
        $sum: "$items.quantity",
      },

      revenue: {
        $sum: "$items.total",
      },

      orders: {
        $sum: 1,
      },
    },
  },

  {
    $match: {
      _id: {
        $ne: null,
      },
    },
  },

  {
    $lookup: {
      from: "categories",
      localField: "_id",
      foreignField: "_id",
      as: "category",
    },
  },

  {
    $unwind: {
      path: "$category",
      preserveNullAndEmptyArrays: true,
    },
  },

  {
    $project: {
      _id: 0,

      categoryId: "$_id",

      name: {
        $ifNull: [
          "$category.name",
          "Uncategorized",
        ],
      },

      quantity: 1,

      revenue: 1,

      orders: 1,
    },
  },

  {
    $sort: {
      revenue: -1,
    },
  },

  {
    $limit: 10,
  },
]);

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER ANALYTICS
    |--------------------------------------------------------------------------
    */

    const previousPeriodStart = new Date(rangeStart);

    previousPeriodStart.setDate(
      previousPeriodStart.getDate() - days
    );

    const previousPeriodEnd = new Date(rangeStart);

    const [
      newUsers,
      previousPeriodUsers,
      uniqueCustomers,
    ] = await Promise.all([
      User.countDocuments({
        createdAt: {
          $gte: rangeStart,
          $lte: now,
        },
      }),

      User.countDocuments({
        createdAt: {
          $gte: previousPeriodStart,
          $lt: previousPeriodEnd,
        },
      }),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: rangeStart,
              $lte: now,
            },
          },
        },

        {
          $project: {
            customer: {
              $ifNull: [
                "$userId",
                "$guestId",
              ],
            },
          },
        },

        {
          $match: {
            customer: {
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id: "$customer",
          },
        },

        {
          $count: "count",
        },
      ]),
    ]);

    /*
    |--------------------------------------------------------------------------
    | PREVIOUS PERIOD REVENUE
    |--------------------------------------------------------------------------
    */

    const previousRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: previousPeriodStart,
            $lt: previousPeriodEnd,
          },

          orderStatus: {
            $ne: "cancelled",
          },
        },
      },

      {
        $group: {
          _id: null,

          revenue: {
            $sum: "$total",
          },

          orders: {
            $sum: 1,
          },
        },
      },
    ]);

    const previousRevenue =
      Number(previousRevenueResult[0]?.revenue || 0);

    const previousOrders =
      Number(previousRevenueResult[0]?.orders || 0);

    /*
    |--------------------------------------------------------------------------
    | GROWTH
    |--------------------------------------------------------------------------
    */

    const calculateGrowth = (current, previous) => {
      if (previous > 0) {
        return Number(
          (((current - previous) / previous) * 100).toFixed(2)
        );
      }

      if (current > 0) {
        return 100;
      }

      return 0;
    };

    const revenueGrowth = calculateGrowth(
      Number(grossRevenue.total || 0),
      previousRevenue
    );

    const orderGrowth = calculateGrowth(
      Number(rangeOrderCount || 0),
      previousOrders
    );

    const userGrowth = calculateGrowth(
      Number(newUsers || 0),
      Number(previousPeriodUsers || 0)
    );

    /*
    |--------------------------------------------------------------------------
    | AVERAGE ORDER VALUE
    |--------------------------------------------------------------------------
    */

    const averageOrderValue =
      Number(grossRevenue.orders || 0) > 0
        ? Number(grossRevenue.total || 0) /
          Number(grossRevenue.orders || 0)
        : 0;

    /*
    |--------------------------------------------------------------------------
    | ITEM METRICS
    |--------------------------------------------------------------------------
    */

    const itemMetricsResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: rangeStart,
            $lte: now,
          },

          orderStatus: {
            $ne: "cancelled",
          },
        },
      },

      {
        $unwind: "$items",
      },

      {
        $group: {
          _id: null,

          quantity: {
            $sum: "$items.quantity",
          },

          revenue: {
            $sum: "$items.total",
          },
        },
      },
    ]);

    const itemMetrics = itemMetricsResult[0] || {
      quantity: 0,
      revenue: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | INVENTORY HEALTH
    |
    | Product stock structure differs between projects, so only use
    | isOutOfStock here. Low-stock should preferably come from your
    | Inventory collection if that is where stock is maintained.
    |--------------------------------------------------------------------------
    */

    const outOfStockProducts =
      await Product.countDocuments({
        isOutOfStock: true,
      });

    /*
    |--------------------------------------------------------------------------
    | LOW STOCK
    |
    | Supports products that have totalStock.
    | If your stock lives only in Inventory, change this to Inventory.
    |--------------------------------------------------------------------------
    */

    const lowStockProducts =
      await Product.countDocuments({
        isOutOfStock: false,
        totalStock: {
          $lte: 5,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | RECENT ORDERS
    |--------------------------------------------------------------------------
    */

    const lastOrders = await Order.find({})
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .select(
        "publicOrderId orderNumber email items subtotal shippingFee total paymentMethod paymentStatus orderStatus fulfillmentStatus createdAt currency source"
      )
      .lean();

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    res.json({
      success: true,

      range: {
        days,
        start: rangeStart,
        end: now,
      },

      overview: {
        users,
        products,
        orders,

        rangeOrders: rangeOrderCount,

        paidOrders,
        pendingPayments,

        deliveredOrders,
        cancelledOrders,
        returnedOrders,

        lowStockProducts,
        outOfStockProducts,
      },

      revenue: {
        /*
         * Gross order value for the selected period.
         */
        total: Number(grossRevenue.total || 0),

        subtotal: Number(
          grossRevenue.subtotal || 0
        ),

        shipping: Number(
          grossRevenue.shipping || 0
        ),

        discount: Number(
          grossRevenue.discount || 0
        ),

        orders: Number(
          grossRevenue.orders || 0
        ),

        averageOrderValue: Number(
          averageOrderValue.toFixed(2)
        ),

        /*
         * Actual paid revenue.
         */
        paid: Number(
          paidRevenue.total || 0
        ),

        paidOrders: Number(
          paidRevenue.orders || 0
        ),
      },

      growth: {
        revenue: revenueGrowth,
        orders: orderGrowth,
        users: userGrowth,
      },

      customers: {
        newUsers,

        previousPeriodUsers,

        uniqueCustomers:
          uniqueCustomers[0]?.count || 0,
      },

      items: {
        quantity: Number(
          itemMetrics.quantity || 0
        ),

        revenue: Number(
          itemMetrics.revenue || 0
        ),
      },

      revenueData,

      orderStatusData,

      paymentStatusData,

      fulfillmentData,

      sourceData,

      topProducts,

      topCategories,

      lastOrders,
    });
  } catch (error) {
    console.error(
      "ADMIN STATS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load admin statistics",
    });
  }
});

export default router;