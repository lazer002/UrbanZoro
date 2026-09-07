import express from "express";
import mongoose from "mongoose";

import { Notification } from "../models/Notification.js";
import { DeviceToken } from "../models/DeviceToken.js";

import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

/* =======================================================
   OWNER
======================================================= */

function getOwner(req) {
  const userId = req.user?.id || null;

  const guestId =
    req.guestId ||
    req.headers["x-guest-id"] ||
    null;

  if (userId) {
    return {
      userId,
      guestId: null,
      query: { userId },
    };
  }

  if (guestId) {
    return {
      userId: null,
      guestId,
      query: { guestId },
    };
  }

  return null;
}

/* =======================================================
   SEND EXPO PUSH
======================================================= */

async function sendExpoPush({
  userId,
  guestId,
  title,
  body,
  data = {},
}) {
  const query = userId
    ? {
        userId,
        enabled: true,
        provider: "expo",
      }
    : guestId
      ? {
          guestId,
          enabled: true,
          provider: "expo",
        }
      : null;

  if (!query) {
    return;
  }

  const devices =
    await DeviceToken.find(query).lean();

  if (!devices.length) {
    return;
  }

  const messages = devices.map(
    (device) => ({
      to: device.token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    })
  );

  const response = await fetch(
    "https://exp.host/--/api/v2/push/send",
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(messages),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Expo push failed: ${response.status}`
    );
  }

  return response.json();
}

/* =======================================================
   REGISTER DEVICE
======================================================= */

router.post(
  "/devices",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.status(401).json({
          success: false,
          message: "Owner not found",
        });
      }

      const {
        token,
        platform = "unknown",
        provider = "expo",
        deviceId = null,
        appVersion = null,
      } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Push token required",
        });
      }

      const device =
        await DeviceToken.findOneAndUpdate(
          { token },
          {
            $set: {
              token,

              userId:
                owner.userId || null,

              guestId:
                owner.guestId || null,

              platform,
              provider,
              deviceId,
              appVersion,

              enabled: true,

              lastSeenAt:
                new Date(),

              disabledAt: null,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );

      res.json({
        success: true,
        deviceId: device._id,
      });
    } catch (error) {
      console.error(
        "REGISTER DEVICE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   DISABLE DEVICE
======================================================= */

router.delete(
  "/devices",
  optionalAuth,
  async (req, res) => {
    try {
      const {
        token,
      } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
        });
      }

      await DeviceToken.findOneAndUpdate(
        { token },
        {
          $set: {
            enabled: false,
            disabledAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "DISABLE DEVICE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   CLAIM GUEST DEVICE AFTER LOGIN
======================================================= */

router.post(
  "/devices/claim",
  optionalAuth,
  async (req, res) => {
    try {
      const userId = req.user?.id;

      const guestId =
        req.guestId ||
        req.headers["x-guest-id"];

      if (!userId || !guestId) {
        return res.status(400).json({
          success: false,
        });
      }

      await DeviceToken.updateMany(
        {
          guestId,
        },
        {
          $set: {
            userId,
            guestId: null,
            lastSeenAt: new Date(),
          },
        }
      );

      await Notification.updateMany(
        {
          guestId,
        },
        {
          $set: {
            userId,
            guestId: null,
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "CLAIM DEVICE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   CREATE NOTIFICATION
======================================================= */

router.post(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const {
        userId,
        guestId,
        type,
        title,
        body,
        payload = {},
        priority = "normal",
        expiresAt = null,
        sendPush = true,
      } = req.body;

      if (!type || !title || !body) {
        return res.status(400).json({
          success: false,
          message:
            "type, title and body are required",
        });
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message:
            "userId or guestId required",
        });
      }

      const notification =
        await Notification.create({
          userId: userId || null,
          guestId: guestId || null,

          type,
          title,
          body,

          payload,
          priority,
          expiresAt,

          push: {
            enabled: sendPush,
          },
        });

      /* PUSH */

      if (sendPush) {
        try {
          await sendExpoPush({
            userId,
            guestId,
            title,
            body,

            data: {
              notificationId:
                notification._id.toString(),

              type,

              ...payload,
            },
          });

          await Notification.updateOne(
            {
              _id:
                notification._id,
            },
            {
              $set: {
                "push.sent":
                  true,

                "push.sentAt":
                  new Date(),

                "push.failed":
                  false,
              },

              $inc: {
                "push.attempts":
                  1,
              },
            }
          );
        } catch (pushError) {
          await Notification.updateOne(
            {
              _id:
                notification._id,
            },
            {
              $set: {
                "push.failed":
                  true,

                "push.failedAt":
                  new Date(),

                "push.error":
                  pushError?.message ||
                  "Push failed",
              },

              $inc: {
                "push.attempts":
                  1,
              },
            }
          );
        }
      }

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "CREATE NOTIFICATION ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   GET ALL
======================================================= */

router.get(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.json({
          success: true,
          notifications: [],
        });
      }

      const notifications =
        await Notification.find(
          owner.query
        )
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .lean();

      res.json({
        success: true,
        notifications,
      });
    } catch (error) {
      console.error(
        "GET NOTIFICATIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   UNREAD COUNT
======================================================= */

router.get(
  "/unread-count",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.json({
          success: true,
          count: 0,
        });
      }

      const count =
        await Notification.countDocuments({
          ...owner.query,
          read: false,
        });

      res.json({
        success: true,
        count,
      });
    } catch (error) {
      console.error(
        "UNREAD COUNT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   DETAIL
======================================================= */

router.get(
  "/detail/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.status(404).json({
          success: false,
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
        });
      }

      const notification =
        await Notification.findOne({
          _id: req.params.id,
          ...owner.query,
        }).lean();

      if (!notification) {
        return res.status(404).json({
          success: false,
        });
      }

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "DETAIL ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   READ ONE
======================================================= */

router.patch(
  "/:id/read",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.status(404).json({
          success: false,
        });
      }

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: req.params.id,
            ...owner.query,
          },
          {
            $set: {
              read: true,
              readAt: new Date(),
            },
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
        });
      }

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "READ ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   READ ALL
======================================================= */

router.patch(
  "/read-all",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.json({
          success: true,
        });
      }

      await Notification.updateMany(
        {
          ...owner.query,
          read: false,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "READ ALL ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

/* =======================================================
   DELETE
======================================================= */

router.delete(
  "/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const owner = getOwner(req);

      if (!owner) {
        return res.status(404).json({
          success: false,
        });
      }

      const deleted =
        await Notification.findOneAndDelete({
          _id: req.params.id,
          ...owner.query,
        });

      if (!deleted) {
        return res.status(404).json({
          success: false,
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

export default router;