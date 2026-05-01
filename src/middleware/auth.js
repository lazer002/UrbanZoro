import { verifyAccessToken } from "../utils/jwt.js";
import jwt from "jsonwebtoken";


export function requireAuth(req, res, next) {

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
    
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);

    const id = payload.id || payload.userId || payload._id;

    if (!id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.user = { id: String(id), ...payload };

    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}


export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const guestId = req.headers["x-guest-id"] || null;

  // user
  if (token) {
    try {
      const payload = verifyAccessToken(token);

      const id = payload.id || payload.userId || payload._id;

      if (id) {
        req.user = { id: String(id), ...payload };
      }
    } catch (e) {
      console.log("Invalid token, continuing as guest");
    }
  }

  // guest
  if (guestId) {
    req.guestId = guestId;
  }

  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
