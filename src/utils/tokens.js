'use strict';

const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * Sign a short-lived access token.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer:    'tenderbite-service',
  });
}

/**
 * Sign a long-lived refresh token.
 * The raw token is returned; the caller stores only the hash.
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer:    'tenderbite-service',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Derive the expiry Date from a signed JWT without trusting user input.
 */
function getTokenExpiry(token) {
  const decoded = jwt.decode(token);
  return new Date(decoded.exp * 1000);
}

/**
 * SHA-256 hash used to store refresh tokens in the DB
 * instead of the raw bearer value.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash a plain-text password.
 */
async function hashPassword(plain) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  return bcrypt.hash(plain, rounds);
}

/**
 * Verify a plain-text password against a stored hash.
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiry,
  hashToken,
  hashPassword,
  verifyPassword,
};
