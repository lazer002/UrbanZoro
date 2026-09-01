// middleware/auth.js

import { verifyAccessToken } from "../utils/jwt.js";

/* =========================================================
   GET BEARER TOKEN
========================================================= */

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  return token || null;
}

/* =========================================================
   REQUIRE AUTH
========================================================= */

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      code: "NO_ACCESS_TOKEN",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    const userId =
      payload?.id ||
      payload?.userId ||
      payload?._id;

    if (!userId) {
      return res.status(401).json({
        error: "Invalid token payload",
        code: "INVALID_TOKEN_PAYLOAD",
      });
    }

    req.user = {
      id: String(userId),
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "ACCESS_TOKEN_EXPIRED",
    });
  }
}

/* =========================================================
   OPTIONAL AUTH
========================================================= */

export function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  const guestId =
    req.headers["x-guest-id"] || null;

  if (token) {
    try {
      const payload =
        verifyAccessToken(token);

      const userId =
        payload?.id ||
        payload?.userId ||
        payload?._id;

      if (userId) {
        req.user = {
          id: String(userId),
          role: payload.role,
          email: payload.email,
          name: payload.name,
        };
      }
    } catch {
      req.user = undefined;
    }
  }

  if (guestId) {
    req.guestId = String(guestId);
  }

  next();
}

/* =========================================================
   REQUIRE ADMIN
========================================================= */

export function requireAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({
      error: "Unauthorized",
      code: "AUTH_REQUIRED",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      code: "ADMIN_REQUIRED",
    });
  }

  next();
}