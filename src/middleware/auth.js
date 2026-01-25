import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const debug = Boolean(process.env.DEBUG_AUTH);

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (debug) {
    console.log("\n=== AUTH DEBUG ===");
    console.log("Auth header raw:", authHeader || "[missing]");
  }

  if (!token) {
 return next();
  }

  if (debug) {
    console.log("Extracted token (first 30 chars):", token.slice(0, 30) + "...");
  }

  try {
    const payload = verifyAccessToken(token);

    if (debug) {
      console.log("Decoded payload:", payload);
    }

    if (!payload || typeof payload !== "object") {
      if (debug) console.log("Invalid payload type:", payload);
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const id = payload.id || payload.userId || payload._id;

    if (debug) {
      console.log("Normalized user id:", id);
    }

    if (!id) {
      if (debug) console.log("Missing id in payload");
      return res
        .status(401)
        .json({ error: "Invalid token payload (missing id)" });
    }

    req.user = { id: String(id), ...payload };

    if (debug) {
      console.log("Authenticated user:", req.user);
      console.log("=== AUTH OK ===\n");
    }

    return next();
  } catch (e) {
    if (debug) {
      console.error("verifyAccessToken ERROR:", e.message);
      console.log("=== AUTH FAILED ===\n");
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
