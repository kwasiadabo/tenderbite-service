'use strict';

const userModel = require('../models/user.model');
const tokens    = require('../utils/tokens');
const logger    = require('../utils/logger');

/**
 * Register a new user.
 * Throws on duplicate email or validation issues.
 */
async function register({ email, password, firstName, lastName }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.code  = 'EMAIL_CONFLICT';
    throw err;
  }

  const passwordHash = await tokens.hashPassword(password);
  const user = await userModel.createUser({ email, passwordHash, firstName, lastName });

  logger.info(`New user registered: ${user.id}`);
  return sanitiseUser(user);
}

/**
 * Authenticate credentials and return token pair.
 */
async function login({ email, password }) {
  const user = await userModel.findByEmail(email);

  // Constant-time path: always compare even when user not found
  const passwordHash = user ? user.password_hash : '$2a$12$invalidhashplaceholder000000000000000000000000000000';
  const valid = await tokens.verifyPassword(password, passwordHash);

  if (!user || !valid) {
    const err = new Error('Invalid email or password');
    err.code  = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.code  = 'ACCOUNT_INACTIVE';
    throw err;
  }

  const tokenPair = await _issueTokenPair(user);
  await userModel.updateLastLogin(user.id);

  logger.info(`User logged in: ${user.id}`);
  return tokenPair;
}

/**
 * Rotate a refresh token: revoke old, issue new pair.
 */
async function refreshTokens(rawRefreshToken) {
  let decoded;
  try {
    decoded = tokens.verifyRefreshToken(rawRefreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.code  = 'INVALID_TOKEN';
    throw err;
  }

  const tokenHash = tokens.hashToken(rawRefreshToken);
  const stored    = await userModel.findRefreshToken(tokenHash);

  if (!stored || !stored.is_active) {
    const err = new Error('Refresh token not found or revoked');
    err.code  = 'INVALID_TOKEN';
    throw err;
  }

  // Revoke old token
  await userModel.revokeRefreshToken(tokenHash);

  const user = await userModel.findById(decoded.sub);
  if (!user) {
    const err = new Error('User not found');
    err.code  = 'NOT_FOUND';
    throw err;
  }

  return _issueTokenPair(user);
}

/**
 * Revoke a specific refresh token (single-device logout).
 */
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = tokens.hashToken(rawRefreshToken);
  await userModel.revokeRefreshToken(tokenHash);
}

/**
 * Revoke all refresh tokens for a user (all-device logout).
 */
async function logoutAll(userId) {
  await userModel.revokeAllUserRefreshTokens(userId);
  logger.info(`All tokens revoked for user: ${userId}`);
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function _issueTokenPair(user) {
  const payload = { sub: user.id, role: user.role };

  const accessToken  = tokens.signAccessToken(payload);
  const refreshToken = tokens.signRefreshToken(payload);

  const tokenHash = tokens.hashToken(refreshToken);
  const expiresAt = tokens.getTokenExpiry(refreshToken);

  await userModel.saveRefreshToken({ userId: user.id, tokenHash, expiresAt });

  return {
    accessToken,
    refreshToken,
    user: sanitiseUser(user),
  };
}

function sanitiseUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = { register, login, refreshTokens, logout, logoutAll };
