'use strict';

/**
 * Standardised API response envelope.
 *
 * Success:  { success: true,  data,    meta? }
 * Error:    { success: false, error: { code, message, details? } }
 */

const sendSuccess = (res, data = null, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const sendCreated = (res, data = null) => sendSuccess(res, data, 201);

const sendError = (res, statusCode, code, message, details = null) => {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
};

const sendBadRequest   = (res, message, details) => sendError(res, 400, 'BAD_REQUEST', message, details);
const sendUnauthorized = (res, message = 'Unauthorized') => sendError(res, 401, 'UNAUTHORIZED', message);
const sendForbidden    = (res, message = 'Forbidden')    => sendError(res, 403, 'FORBIDDEN', message);
const sendNotFound     = (res, message = 'Not found')    => sendError(res, 404, 'NOT_FOUND', message);
const sendConflict     = (res, message)                  => sendError(res, 409, 'CONFLICT', message);
const sendServerError  = (res, message = 'Internal server error') =>
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendServerError,
};
