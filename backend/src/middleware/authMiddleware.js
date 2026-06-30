'use strict';

const { verifyToken } = require('../utils/jwtUtils');
const db = require('../config/db');

/**
 * JWT Authentication Middleware
 * Reads Bearer token from Authorization header, verifies with JWT_SECRET,
 * fetches user from DB, checks is_active=1, attaches full user object to req.user.
 *
 * Returns:
 *   401 - if no token provided or token is invalid/expired
 *   403 - if user account is inactive
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        data: null,
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is empty.',
        data: null,
      });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Token has expired. Please log in again.',
          data: null,
        });
      }
      // JsonWebTokenError, NotBeforeError, etc.
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.',
        data: null,
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed token payload.',
        data: null,
      });
    }

    // 3. Fetch user from database
    const [rows] = await db.query(
      `SELECT 
        u.id,
        u.email,
        u.role_id,
        u.full_name,
        u.mobile_number,
        u.is_active,
        r.name AS role_name
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?`,
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.',
        data: null,
      });
    }

    const user = rows[0];

    // 4. Check if user is active
    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your account has been deactivated. Please contact an administrator.',
        data: null,
      });
    }

    // 5. Attach user object to request
    req.user = {
      id: user.id,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      full_name: user.full_name,
      mobile_number: user.mobile_number,
      is_active: user.is_active,
    };

    // Temporary Dev Logging
    if (process.env.NODE_ENV !== 'production') {
      console.log({
        endpoint: req.originalUrl,
        method: req.method,
        user: req.user,
        authorization: authHeader
      });
    }

    next();
  } catch (error) {
    console.error('[authMiddleware] Unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      data: null,
    });
  }
};

module.exports = authMiddleware;
module.exports.authenticate = authMiddleware;
