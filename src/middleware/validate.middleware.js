'use strict';

const { validationResult } = require('express-validator');
const { sendBadRequest } = require('../utils/response');

/**
 * Run after express-validator rule arrays.
 * Collects all field errors and returns a structured 400 response.
 */
function validate(req, res, next) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const details = errors
			.array()
			.map(({ path, msg }) => ({ field: path, message: msg }));
		return sendBadRequest(res, 'Validation failed', details);
	}
	next();
}

module.exports = { validate };
