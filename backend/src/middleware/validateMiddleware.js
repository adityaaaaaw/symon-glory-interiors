'use strict';

const { validationResult } = require('express-validator');

/**
 * Validation Middleware Factory
 *
 * Accepts an array of express-validator validation chains and returns a
 * middleware array that:
 *   1. Runs all validations in sequence.
 *   2. Collects results.
 *   3. Returns a 400 response with structured error details if any fail.
 *   4. Calls next() if all validations pass.
 *
 * Error response format:
 * {
 *   success: false,
 *   message: 'Validation failed',
 *   errors: [{ field: string, message: string }]
 * }
 *
 * @param {import('express-validator').ValidationChain[]} validations - Array of express-validator chains
 * @returns {Array<import('express').RequestHandler>} Express middleware array
 *
 * @example
 * const { body } = require('express-validator');
 * const { validate } = require('../middleware/validateMiddleware');
 *
 * router.post(
 *   '/register',
 *   validate([
 *     body('email').isEmail().withMessage('Must be a valid email address'),
 *     body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
 *     body('full_name').trim().notEmpty().withMessage('Full name is required'),
 *   ]),
 *   authController.register
 * );
 */
const validate = (validations) => {
  if (!Array.isArray(validations) || validations.length === 0) {
    throw new Error(
      '[validateMiddleware] validate() requires a non-empty array of express-validator chains.'
    );
  }

  // Return the validation chains followed by the error-check handler
  return [
    ...validations,

    /**
     * Error aggregation handler — runs after all validation chains
     */
    (req, res, next) => {
      const result = validationResult(req);

      if (result.isEmpty()) {
        // All validations passed
        return next();
      }

      // Map errors to a clean { field, message } format
      const errors = result.array({ onlyFirstError: true }).map((err) => {
        // express-validator v7+ uses err.path; v6 uses err.param
        const field = err.path !== undefined ? err.path : err.param !== undefined ? err.param : 'unknown';
        return {
          field,
          message: err.msg,
        };
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    },
  ];
};

module.exports = { validate };
