'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const { requireRole, requireAnyRole } = require('../middleware/roleMiddleware');
const {
  detectPriority,
  generateSummary,
  generateConfirmation,
  generateReminder,
  generateFollowUp,
} = require('../controllers/aiController');

// POST /api/ai/priority – Admin, Designer, or Site Engineer
router.post(
  '/priority',
  authenticate,
  requireAnyRole('Admin', 'Designer', 'Site Engineer'),
  detectPriority
);

// POST /api/ai/summary – Designer or Site Engineer only
router.post(
  '/summary',
  authenticate,
  requireAnyRole('Designer', 'Site Engineer'),
  generateSummary
);

// POST /api/ai/confirmation – Admin only
router.post(
  '/confirmation',
  authenticate,
  requireRole('Admin'),
  generateConfirmation
);

// POST /api/ai/reminder – Admin only
router.post(
  '/reminder',
  authenticate,
  requireRole('Admin'),
  generateReminder
);

// POST /api/ai/follow-up – Any authenticated user
router.post('/follow-up', authenticate, generateFollowUp);

module.exports = router;
