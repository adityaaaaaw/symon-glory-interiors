'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getAdminMetrics,
  getConversionFunnel,
  getDesignerMetrics,
  getEngineerMetrics,
  getClientMetrics,
  getRecentActivity,
} = require('../controllers/dashboardController');

// GET /api/dashboard/admin
router.get('/admin', authenticate, requireRole('Admin'), getAdminMetrics);

// GET /api/dashboard/conversion
router.get('/conversion', authenticate, requireRole('Admin'), getConversionFunnel);

// GET /api/dashboard/designer
router.get('/designer', authenticate, requireRole('Designer'), getDesignerMetrics);

// GET /api/dashboard/engineer
router.get('/engineer', authenticate, requireRole('Site Engineer'), getEngineerMetrics);

// GET /api/dashboard/client
router.get('/client', authenticate, requireRole('Client'), getClientMetrics);

// GET /api/dashboard/activity
router.get('/activity', authenticate, requireRole('Admin'), getRecentActivity);

module.exports = router;
