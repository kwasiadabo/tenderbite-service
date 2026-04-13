'use strict';

const authService = require('../services/auth.service');
const {
  sendCreated,
  sendSuccess,
  sendConflict,
  sendUnauthorized,
  sendNotFound,
  sendServerError,
} = require('../utils/response');

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName } = req.body;
    const user = await authService.register({ email, password, firstName, lastName });
    return sendCreated(res, { user });
  } catch (err) {
    if (err.code === 'EMAIL_CONFLICT') return sendConflict(res, err.message);
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result);
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS' || err.code === 'ACCOUNT_INACTIVE') {
      return sendUnauthorized(res, err.message);
    }
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.code === 'INVALID_TOKEN') return sendUnauthorized(res, err.message);
    if (err.code === 'NOT_FOUND')     return sendNotFound(res, err.message);
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Revoke the provided refresh token (single device).
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    return sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout-all
 * Revoke all refresh tokens for the authenticated user.
 * Requires authenticate() middleware.
 */
async function logoutAll(req, res, next) {
  try {
    await authService.logoutAll(req.user.sub);
    return sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Return profile for authenticated user.
 */
async function me(req, res, next) {
  try {
    const userModel = require('../models/user.model');
    const user = await userModel.findById(req.user.sub);
    if (!user) return sendNotFound(res, 'User not found');
    const { password_hash, ...safe } = user;
    return sendSuccess(res, { user: safe });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, logoutAll, me };
