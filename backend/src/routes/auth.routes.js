/**
 * Glory Simon Interiors - Site Visit Booking System
 * Auth Routes
 *
 * Base: /api/auth
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
console.log('--- DEBUG controller in routes ---', controller);
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new client account.
 * Body: { full_name, mobile_number, email, password }
 */
router.post('/register', controller.register);

/**
 * POST /api/auth/login
 * Authenticate and receive a JWT.
 * Body: { email, password }
 */
router.post('/login', controller.login);

// ─── Protected Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile (all roles).
 * Headers: { Authorization: Bearer <token> }
 */
router.get('/me', authenticate, controller.getMe);

/**
 * PUT /api/auth/profile
 * Update the currently authenticated user's profile.
 * Headers: { Authorization: Bearer <token> }
 * Body: { full_name, mobile_number, [address, city, pincode] }   (address fields Client-only)
 */
router.put('/profile', authenticate, controller.updateProfile);

/**
 * GET /api/auth/users
 * Admin only – list all users or search.
 * Headers: { Authorization: Bearer <token> }
 */
router.get('/users', authenticate, requireRole('Admin'), controller.getUsers);

/**
 * PATCH /api/auth/users/:id/status
 * Admin only – enable/disable a user.
 * Headers: { Authorization: Bearer <token> }
 */
router.patch('/users/:id/status', authenticate, requireRole('Admin'), controller.toggleUserStatus);

module.exports = router;

