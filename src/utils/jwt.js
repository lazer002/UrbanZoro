
// utils/jwt.js
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_TTL = '60m'
const REFRESH_TOKEN_TTL = '7d'

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: ACCESS_TOKEN_TTL })
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret', { expiresIn: REFRESH_TOKEN_TTL })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret')
}


