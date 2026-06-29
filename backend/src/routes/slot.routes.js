// src/routes/slot.routes.js
const express    = require('express');
const router     = express.Router();
const { authenticate }              = require('../middleware/authMiddleware');
const { requireRole }               = require('../middleware/roleMiddleware');
const {
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getSlotsByDateRange,
} = require('../controllers/slotController');

/**
 * GET /api/slots
 * Public – list available slots for a given date (defaults to today → +7 days).
 * Query params: ?date=YYYY-MM-DD
 */
router.get('/', getSlots);

/**
 * GET /api/slots/range
 * Admin – list all slots (including inactive) within a date range.
 * Query params: ?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 * NOTE: Must be defined before /:id to avoid Express treating "range" as an :id param.
 */
router.get(
  '/range',
  authenticate,
  requireRole('Admin'),
  getSlotsByDateRange
);

/**
 * POST /api/slots
 * Admin – create a new time slot.
 */
router.post(
  '/',
  authenticate,
  requireRole('Admin'),
  createSlot
);

/**
 * PUT /api/slots/:id
 * Admin – update max_bookings or is_active for an existing slot.
 */
router.put(
  '/:id',
  authenticate,
  requireRole('Admin'),
  updateSlot
);

/**
 * DELETE /api/slots/:id
 * Admin – soft-delete a slot (only if it has zero bookings).
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('Admin'),
  deleteSlot
);

module.exports = router;
