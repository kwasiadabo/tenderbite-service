'use strict';

const { body } = require('express-validator');

const registerRules = [
  body('email')
    .trim()
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one digit')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),

  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
];

const loginRules = [
  body('email')
    .trim()
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const refreshRules = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
];

module.exports = { registerRules, loginRules, refreshRules };
