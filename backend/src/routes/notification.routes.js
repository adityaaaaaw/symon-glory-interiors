'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('../controllers/notificationController');

// GET /api/notifications
router.get('/', authenticate, getMyNotifications);

// GET /api/notifications/unread-count
// NOTE: must be declared BEFORE /:id/read to avoid param conflict
router.get('/unread-count', authenticate, getUnreadCount);

// PATCH /api/notifications/read-all
// NOTE: must be declared BEFORE /:id/read to avoid "read-all" being consumed as :id
router.patch('/read-all', authenticate, markAllAsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, markAsRead);

module.exports = router;
