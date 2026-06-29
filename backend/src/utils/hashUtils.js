'use strict';

const bcrypt = require('bcryptjs');

/**
 * Password Hashing Utilities using bcrypt
 *
 * Salt Rounds: 10
 * This provides a good balance between security and performance.
 * Each additional round doubles the computation time.
 * (10 rounds ≈ ~100ms on modern hardware)
 */
const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt.
 *
 * @param {string} plainText - The plain-text password to hash
 * @returns {Promise<string>} Promise resolving to the bcrypt hash string
 * @throws {Error} If plainText is empty or not a string
 *
 * @example
 * const hash = await hashPassword('mySecurePassword123');
 * // Store `hash` in the database
 */
const hashPassword = async (plainText) => {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('[hashUtils] hashPassword() requires a non-empty string.');
  }

  const hash = await bcrypt.hash(plainText, SALT_ROUNDS);
  return hash;
};

/**
 * Compare a plain-text password against a bcrypt hash.
 *
 * @param {string} plainText - The plain-text password to check
 * @param {string} hash - The stored bcrypt hash to compare against
 * @returns {Promise<boolean>} Promise resolving to true if match, false otherwise
 * @throws {Error} If either argument is missing or not a string
 *
 * @example
 * const isMatch = await comparePassword('mySecurePassword123', storedHash);
 * if (!isMatch) {
 *   return res.status(401).json({ success: false, message: 'Invalid credentials' });
 * }
 */
const comparePassword = async (plainText, hash) => {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('[hashUtils] comparePassword() requires a non-empty plainText string.');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('[hashUtils] comparePassword() requires a non-empty hash string.');
  }

  const isMatch = await bcrypt.compare(plainText, hash);
  return isMatch;
};

module.exports = {
  hashPassword,
  comparePassword,
  SALT_ROUNDS,
};
