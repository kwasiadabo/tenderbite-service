'use strict';

const { Router }        = require('express');
const rateLimit         = require('express-rate-limit');
const authController    = require('../controllers/auth.controller');
const { authenticate }  = require('../middleware/auth.middleware');
const { validate }      = require('../middleware/validate.middleware');
const { registerRules, loginRules, refreshRules } = require('../validators/auth.validator');

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10)  || 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' },
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     description: |
 *       Creates a new user account. Emails are stored lower-cased and must be unique.
 *
 *       **Password rules**
 *       - Minimum 8 characters
 *       - At least one uppercase letter
 *       - At least one lowercase letter
 *       - At least one digit
 *       - At least one special character
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   email: "alice@example.com"
 *                   first_name: "Alice"
 *                   last_name: "Smith"
 *                   role: "user"
 *                   is_active: true
 *                   is_verified: false
 *                   last_login_at: null
 *                   created_at: "2024-08-01T12:00:00.000Z"
 *                   updated_at: "2024-08-01T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: CONFLICT
 *                 message: Email already registered
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/register', authLimiter, registerRules, validate, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and obtain a token pair
 *     description: |
 *       Validates credentials and returns a short-lived **access token** (15 min)
 *       and a long-lived **refresh token** (7 days).
 *
 *       Store the refresh token securely (e.g. HttpOnly cookie or secure storage).
 *       Use it with /auth/refresh before the access token expires.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenPair'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   email: "alice@example.com"
 *                   first_name: "Alice"
 *                   last_name: "Smith"
 *                   role: "user"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials or account inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: UNAUTHORIZED
 *                 message: Invalid email or password
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/login', authLimiter, loginRules, validate, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and obtain a new token pair
 *     description: |
 *       Validates the provided refresh token, revokes it, and issues a fresh
 *       access + refresh token pair.
 *
 *       Always replace your stored refresh token with the one returned — the
 *       previous token is immediately invalidated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenPair'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Refresh token is invalid, expired, or already revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: UNAUTHORIZED
 *                 message: Invalid or expired refresh token
 *       429:
 *         description: Too many requests
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/refresh', authLimiter, refreshRules, validate, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token (single-device logout)
 *     description: |
 *       Revokes the supplied refresh token. The access token remains valid
 *       until it naturally expires. To invalidate all sessions use /auth/logout-all.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: Token revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data: null
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/logout', refreshRules, validate, authController.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke all refresh tokens (all-device logout)
 *     description: |
 *       Revokes every active refresh token for the authenticated user,
 *       signing them out of all devices simultaneously.
 *       Requires a valid access token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All tokens revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     description: Returns the full profile of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   email: "alice@example.com"
 *                   first_name: "Alice"
 *                   last_name: "Smith"
 *                   role: "user"
 *                   is_active: true
 *                   is_verified: false
 *                   last_login_at: "2024-08-01T12:05:00.000Z"
 *                   created_at: "2024-08-01T12:00:00.000Z"
 *                   updated_at: "2024-08-01T12:05:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: User not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
