'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getCalendarData } = require('../controllers/calendarController');

// GET /api/calendar?view=month&date=2025-06-01
router.get('/', authenticate, requireRole('Admin'), getCalendarData);

module.exports = router;
