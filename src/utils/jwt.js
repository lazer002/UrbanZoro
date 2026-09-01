// utils/jwt.js

import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL = "60m";
const REFRESH_TOKEN_TTL = "7d";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

if (!JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_REFRESH_SECRET is not configured"
  );
}

export function signAccessToken(payload) {
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_TTL,
    }
  );
}

export function signRefreshToken(payload) {
  return jwt.sign(
    payload,
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_TTL,
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(
    token,
    JWT_SECRET
  );
}

export function verifyRefreshToken(token) {
  return jwt.verify(
    token,
    JWT_REFRESH_SECRET
  );
}