'use strict';

const { query } = require('../config/db');

// ─────────────────────────────────────────────
// GET /notifications
// ─────────────────────────────────────────────
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // Optional filters
    const typeFilter = req.query.type || null;       // Email | WhatsApp | In-App
    const isReadFilter = req.query.is_read;          // '0' | '1'

    // Build dynamic WHERE clauses
    const conditions = ['user_id = ?'];
    const params = [userId];

    if (typeFilter) {
      conditions.push('type = ?');
      params.push(typeFilter);
    }

    if (isReadFilter === '0' || isReadFilter === '1') {
      conditions.push('is_read = ?');
      params.push(parseInt(isReadFilter, 10));
    }

    const whereClause = conditions.join(' AND ');

    // Count total for pagination
    const [countRow] = await query(
      `SELECT COUNT(*) AS total FROM notifications WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRow ? countRow.total : 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated rows
    const notifications = await query(
      `SELECT id, booking_id, title, message, type, status, is_read, sent_at, created_at
       FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      },
    });
  } catch (err) {
    console.error('[getMyNotifications]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /notifications/:id/read
// ─────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = parseInt(req.params.id, 10);

    if (isNaN(notifId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification id',
        data: null,
      });
    }

    const [result] = await query(
      "UPDATE notifications SET is_read = 1, status = 'Read' WHERE id = ? AND user_id = ?",
      [notifId, userId]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to you',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { id: notifId },
    });
  } catch (err) {
    console.error('[markAsRead]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /notifications/read-all
// ─────────────────────────────────────────────
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await query(
      "UPDATE notifications SET is_read = 1, status = 'Read' WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    const updated = result ? result.affectedRows : 0;

    return res.status(200).json({
      success: true,
      message: `${updated} notification(s) marked as read`,
      data: { updated_count: updated },
    });
  } catch (err) {
    console.error('[markAllAsRead]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /notifications/unread-count
// ─────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [row] = await query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Unread count fetched',
      data: { count: parseInt(row ? row.count : 0, 10) },
    });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      data: null,
    });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
