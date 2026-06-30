/**
 * Glory Simon Interiors - Site Visit Booking System
 * Auth Controller
 *
 * Handles: register, login, getMe, updateProfile
 */

'use strict';

const { body, validationResult } = require('express-validator');
const { query }                  = require('../config/db');
const { signToken }              = require('../utils/jwtUtils');
const { hashPassword, comparePassword } = require('../utils/hashUtils');

// ─── Validation Rule Sets ──────────────────────────────────────────────────────

/** Validation rules for POST /register */
const registerValidators = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),

  body('mobile_number')
    .trim()
    .notEmpty().withMessage('Mobile number is required.')
    .matches(/^\d{10}$/).withMessage('Please enter a valid 10-digit mobile number.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Email must be a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

/** Validation rules for POST /login */
const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Email must be a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ─── Helper: run validators and return errors ──────────────────────────────────
function extractValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map(e => e.msg);
  }
  return null;
}

// ─── Helper: safe user object (no password_hash) ──────────────────────────────
function safeUser(user) {
  const { password_hash, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}

// ─── Helper: log activity ──────────────────────────────────────────────────────
async function logActivity({ userId, action, entityType, entityId, details, req }) {
  try {
    const ip        = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId, JSON.stringify(details || {}), ip, userAgent],
    );
  } catch (_) {
    // Non-fatal — never crash the request because of logging
  }
}

// ─── Controller Methods ────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new client account.
 */
async function register(req, res) {
  // Temporary Dev Log: Request Payload
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV LOG] /api/auth/register Request Payload:', req.body);
  }

  // 1. Run inline validators
  await Promise.all(registerValidators.map(v => v.run(req)));
  const errs = extractValidationErrors(req);
  if (errs) {
    const errorResponse = { success: false, message: errs[0], errors: errs };
    
    // Temporary Dev Log: Validation Errors & HTTP Status
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV LOG] /api/auth/register Validation Errors:', errs);
      console.log('[DEV LOG] /api/auth/register API Response (Status 422):', errorResponse);
    }
    
    return res.status(422).json(errorResponse);
  }

  const { full_name, mobile_number, email, password } = req.body;

  try {
    // 2. Check email uniqueness
    const [existing] = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (existing.length > 0) {
      const errorResponse = { success: false, message: 'Email already registered.', field: 'email' };
      
      // Temporary Dev Log: Email exists
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV LOG] /api/auth/register API Response (Status 400): Email already registered.');
      }
      
      return res.status(400).json(errorResponse);
    }

    // 2b. Check mobile number uniqueness (normalize using REPLACE and RIGHT to compare raw digits)
    const cleanMobile = String(mobile_number || '').replace(/\D/g, '');
    const [existingMobile] = await query(
      "SELECT id FROM users WHERE RIGHT(REPLACE(mobile_number, ' ', ''), 10) = ? LIMIT 1",
      [cleanMobile]
    );
    if (existingMobile.length > 0) {
      const errorResponse = { success: false, message: 'Phone number already registered.', field: 'phone' };
      
      // Temporary Dev Log: Phone exists
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV LOG] /api/auth/register API Response (Status 400): Phone number already registered.');
      }
      
      return res.status(400).json(errorResponse);
    }

    // 3. Hash password
    const password_hash = await hashPassword(password);

    // 4. Insert user (role_id = 2 = Client)
    const [userResult] = await query(
      `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number, is_active, created_at, updated_at)
       VALUES (?, ?, 2, ?, ?, 1, NOW(), NOW())`,
      [email, password_hash, full_name, mobile_number],
    );
    const userId = userResult.insertId;

    // 5. Create corresponding client profile (empty address fields for now)
    await query(
      `INSERT INTO clients (user_id, address, city, pincode, created_at, updated_at)
       VALUES (?, '', '', '', NOW(), NOW())`,
      [userId],
    );

    // 6. Sign JWT
    const token = signToken({ id: userId, email, role_id: 2, role_name: 'Client', full_name });

    // 7. Log activity
    await logActivity({
      userId,
      action    : 'USER_REGISTERED',
      entityType: 'users',
      entityId  : userId,
      details   : { email, full_name },
      req,
    });

    const successResponse = {
      success: true,
      message: 'Registration successful. Welcome to Glory Simon Interiors!',
      token,
      user: {
        id           : userId,
        email,
        full_name,
        mobile_number,
        role_id      : 2,
        role_name    : 'Client',
      },
    };

    // Temporary Dev Log: Success API Response & HTTP Status
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV LOG] /api/auth/register API Response (Status 201):', successResponse);
    }

    return res.status(201).json(successResponse);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEV LOG] /api/auth/register Error:', {
        message: err.message,
        stack: err.stack,
        body: { full_name, email, mobile_number }
      });
    }
    
    const dbErrorMsg = err.message || 'Database connection failed.';
    return res.status(500).json({ success: false, message: dbErrorMsg, error: process.env.NODE_ENV !== 'production' ? err.message : undefined });
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return a JWT.
 */
async function login(req, res) {
  // 1. Validate inputs
  await Promise.all(loginValidators.map(v => v.run(req)));
  const errs = extractValidationErrors(req);
  if (errs) {
    return res.status(422).json({ success: false, message: errs[0], errors: errs });
  }

  const { email, password } = req.body;

  try {
    // 2. Fetch user with role name
    const [rows] = await query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?
       LIMIT 1`,
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // 3. Check account is active
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // 4. Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // 5. Update last_login_at
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // 6. Sign JWT
    const token = signToken({
      id       : user.id,
      email    : user.email,
      role_id  : user.role_id,
      role_name: user.role_name,
      full_name: user.full_name,
    });

    // 7. Log activity (non-fatal)
    await logActivity({
      userId    : user.id,
      action    : 'USER_LOGIN',
      entityType: 'users',
      entityId  : user.id,
      details   : { email: user.email },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id           : user.id,
        email        : user.email,
        full_name    : user.full_name,
        mobile_number: user.mobile_number,
        role_id      : user.role_id,
        role_name    : user.role_name,
      },
    });
  } catch (err) {
    console.error('[authController.login]', err.message);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
}

/**
 * GET /api/auth/me
 * Return the authenticated user's full profile (fresh from DB).
 */
async function getMe(req, res) {
  const { id: userId, role_id } = req.user;

  try {
    // 1. Fetch base user with role name
    const [rows] = await query(
      `SELECT u.id, u.email, u.full_name, u.mobile_number, u.role_id, u.is_active,
              u.last_login_at, u.created_at, u.updated_at, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];
    let profile = null;

    // 2. Fetch role-specific profile
    if (role_id === 2) {
      // Client
      const [clientRows] = await query(
        'SELECT id, address, city, pincode, created_at FROM clients WHERE user_id = ? LIMIT 1',
        [userId],
      );
      profile = clientRows[0] || null;
    } else if (role_id === 3) {
      // Designer
      const [designerRows] = await query(
        'SELECT id, specialization, experience_yrs, status FROM designers WHERE user_id = ? LIMIT 1',
        [userId],
      );
      profile = designerRows[0] || null;
    } else if (role_id === 4) {
      // Site Engineer
      const [engineerRows] = await query(
        'SELECT id, specialization, experience_yrs, status FROM site_engineers WHERE user_id = ? LIMIT 1',
        [userId],
      );
      profile = engineerRows[0] || null;
    }

    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully.',
      data: { ...user, profile },
    });
  } catch (err) {
    console.error('[authController.getMe]', err.message);
    return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
}

/**
 * PUT /api/auth/profile
 * Update authenticated user's profile details.
 */
async function updateProfile(req, res) {
  const { id: userId, role_id } = req.user;
  const { full_name, mobile_number, address, city, pincode } = req.body;

  // Basic validation
  if (!full_name || full_name.trim().length < 2) {
    return res.status(422).json({ success: false, message: 'Full name must be at least 2 characters.' });
  }
  if (mobile_number && !/^[6-9]\d{9}$/.test(mobile_number)) {
    return res.status(422).json({ success: false, message: 'Mobile number must be a valid 10-digit Indian mobile number.' });
  }

  try {
    // 1. Update users table
    await query(
      `UPDATE users SET full_name = ?, mobile_number = ?, updated_at = NOW() WHERE id = ?`,
      [full_name.trim(), mobile_number ? mobile_number.trim() : req.user.mobile_number, userId],
    );

    // 2. If client — also update address details
    if (role_id === 2) {
      await query(
        `UPDATE clients SET address = ?, city = ?, pincode = ?, updated_at = NOW() WHERE user_id = ?`,
        [
          address  !== undefined ? address.trim()  : '',
          city     !== undefined ? city.trim()     : '',
          pincode  !== undefined ? pincode.trim()  : '',
          userId,
        ],
      );
    }

    // 3. Fetch updated user
    const [rows] = await query(
      `SELECT u.id, u.email, u.full_name, u.mobile_number, u.role_id, u.is_active,
              u.last_login_at, u.created_at, u.updated_at, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );

    let profile = null;
    if (role_id === 2) {
      const [clientRows] = await query(
        'SELECT id, address, city, pincode, created_at, updated_at FROM clients WHERE user_id = ? LIMIT 1',
        [userId],
      );
      profile = clientRows[0] || null;
    }

    // 4. Log
    await logActivity({
      userId,
      action    : 'PROFILE_UPDATED',
      entityType: 'users',
      entityId  : userId,
      details   : { updated_fields: { full_name, mobile_number } },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { ...rows[0], profile },
    });
  } catch (err) {
    console.error('[authController.updateProfile]', err.message);
    return res.status(500).json({ success: false, message: 'Could not update profile. Please try again.' });
  }
}

/**
 * GET /api/auth/users
 * Admin only — list all users or filter by role, search keyword, etc.
 */
async function getUsers(req, res) {
  try {
    const { role_id, search, is_active } = req.query;
    let sql = `
      SELECT u.id, u.email, u.full_name, u.mobile_number, u.role_id, u.is_active,
             u.last_login_at, u.created_at, u.updated_at, r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (role_id) {
      sql += ' AND u.role_id = ?';
      params.push(parseInt(role_id, 10));
    }
    if (is_active !== undefined && is_active !== '') {
      sql += ' AND u.is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }
    if (search && search.trim() !== '') {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.mobile_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY u.id DESC';

    const [users] = await query(sql, params);

    // Fetch and attach profiles in bulk
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      if (u.role_id === 2) {
        const [c] = await query('SELECT address, city, pincode FROM clients WHERE user_id = ? LIMIT 1', [u.id]);
        u.profile = c[0] || null;
      } else if (u.role_id === 3) {
        const [d] = await query('SELECT specialization, experience_yrs, status FROM designers WHERE user_id = ? LIMIT 1', [u.id]);
        u.profile = d[0] || null;
      } else if (u.role_id === 4) {
        const [e] = await query('SELECT specialization, experience_yrs, status FROM site_engineers WHERE user_id = ? LIMIT 1', [u.id]);
        u.profile = e[0] || null;
      } else {
        u.profile = null;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      users
    });
  } catch (err) {
    console.error('[authController.getUsers]', err.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve users.' });
  }
}

/**
 * PATCH /api/auth/users/:id/status
 * Admin only — activate or deactivate user
 */
async function toggleUserStatus(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { is_active } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }
  if (is_active === undefined) {
    return res.status(400).json({ success: false, message: 'is_active status is required.' });
  }

  // Prevent admin from deactivating themselves
  if (userId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
  }

  try {
    const activeVal = is_active ? 1 : 0;
    await query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [activeVal, userId]);

    // Log activity
    await logActivity({
      userId: req.user.id,
      action: activeVal ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'users',
      entityId: userId,
      details: { target_user_id: userId },
      req
    });

    return res.status(200).json({
      success: true,
      message: `User status updated to ${activeVal ? 'Active' : 'Inactive'}.`
    });
  } catch (err) {
    console.error('[authController.toggleUserStatus]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
}

module.exports = { register, login, getMe, updateProfile, getUsers, toggleUserStatus };

