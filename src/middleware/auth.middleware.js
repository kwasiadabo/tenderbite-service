'use strict';

const { verifyAccessToken }              = require('../utils/tokens');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * Protect a route: validate Bearer access token.
 * Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Access token expired');
    }
    return sendUnauthorized(res, 'Invalid access token');
  }
}

/**
 * Role-based guard – use after authenticate().
 * @param {...string} roles - allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendForbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

module.exports = { authenticate, authorize };
