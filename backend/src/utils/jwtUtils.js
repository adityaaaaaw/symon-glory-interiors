'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT Utilities
 *
 * Environment variables used:
 *   JWT_SECRET      - Secret key for signing/verifying tokens (REQUIRED)
 *   JWT_EXPIRES_IN  - Token expiry duration string (default: '24h')
 *                     Examples: '1h', '7d', '30m', '24h'
 */

/**
 * Sign a JWT token with the given payload.
 *
 * @param {Object} payload - Data to embed in the token.
 *   Recommended fields: { id, email, role_id, role_name }
 *   Do NOT include sensitive data like password_hash.
 * @returns {string} Signed JWT token string
 * @throws {Error} If JWT_SECRET is not configured
 *
 * @example
 * const token = signToken({ id: user.id, email: user.email, role_id: user.role_id });
 */
const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '') {
    throw new Error(
      '[jwtUtils] JWT_SECRET environment variable is not set. ' +
        'Please configure it in your .env file.'
    );
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const token = jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'glory-simon-interiors',
    audience: 'glory-simon-client',
  });

  return token;
};

/**
 * Verify and decode a JWT token.
 *
 * @param {string} token - JWT token string to verify
 * @returns {Object} Decoded payload object
 * @throws {jwt.TokenExpiredError} If the token has expired
 * @throws {jwt.JsonWebTokenError} If the token is invalid/malformed
 * @throws {jwt.NotBeforeError} If the token is not yet active
 * @throws {Error} If JWT_SECRET is not configured
 *
 * @example
 * try {
 *   const decoded = verifyToken(token);
 *   console.log(decoded.id, decoded.email);
 * } catch (err) {
 *   if (err instanceof jwt.TokenExpiredError) { ... }
 * }
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '') {
    throw new Error(
      '[jwtUtils] JWT_SECRET environment variable is not set. ' +
        'Please configure it in your .env file.'
    );
  }

  // This will throw TokenExpiredError, JsonWebTokenError, or NotBeforeError on failure
  const decoded = jwt.verify(token, secret, {
    issuer: 'glory-simon-interiors',
    audience: 'glory-simon-client',
  });

  return decoded;
};

/**
 * Decode a JWT token WITHOUT verification (unsafe — only for debugging/logging).
 * Do NOT use this for authentication decisions.
 *
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded payload or null if decode fails
 */
const decodeTokenUnsafe = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

module.exports = {
  signToken,
  verifyToken,
  decodeTokenUnsafe,
};
