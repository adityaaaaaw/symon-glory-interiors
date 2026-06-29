/**
 * Glory Simon Interiors - Site Visit Booking System
 * Booking Routes
 *
 * Base: /api/bookings
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/bookingController');
const { authenticate }            = require('../middleware/authMiddleware');
const { requireRole, requireAnyRole } = require('../middleware/roleMiddleware');

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * Retrieve all bookings with filters and pagination.
 * Access: Admin, Designer, Site Engineer
 * Query params: status, priority, city, project_type_id, search, page, limit, sort_by, sort_order
 */
router.get(
  '/',
  authenticate,
  requireAnyRole('Admin', 'Designer', 'Site Engineer'),
  controller.getAllBookings,
);

/**
 * POST /api/bookings
 * Submit a new site-visit booking.
 * Access: Client only
 * Body: { property_type, project_type_id, address, city, pincode, preferred_visit_date,
 *         slot_id, num_rooms, estimated_budget, project_description }
 */
router.post(
  '/',
  authenticate,
  requireRole('Client'),
  controller.createBooking,
);

/**
 * GET /api/bookings/my
 * Retrieve the authenticated client's own bookings.
 * Access: Client only
 * Query params: status, page, limit, sort_by, sort_order
 *
 * NOTE: This route MUST be declared before /:id to prevent Express
 * from matching "my" as a booking ID parameter.
 */
router.get(
  '/my',
  authenticate,
  requireRole('Client'),
  controller.getMyBookings,
);

/**
 * GET /api/bookings/:id
 * Retrieve full details of a single booking.
 * Access: All authenticated users (Admin/Staff: any; Client: own only)
 */
router.get(
  '/:id',
  authenticate,
  controller.getBookingById,
);

/**
 * PATCH /api/bookings/:id/status
 * Update booking status through valid transitions.
 * Access: Admin (all transitions); Designer / Site Engineer (In Progress, Completed — own assignments)
 * Body: { status }
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAnyRole('Admin', 'Designer', 'Site Engineer'),
  controller.updateBookingStatus,
);

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking with a mandatory reason.
 * Access: Client (own Pending/Confirmed bookings); Admin (any)
 * Body: { cancellation_reason }
 */
router.patch(
  '/:id/cancel',
  authenticate,
  controller.cancelBooking,
);

/**
 * PATCH /api/bookings/:id/reschedule
 * Reschedule a Pending/Confirmed booking to a new slot.
 * Access: Client only
 * Body: { slot_id, preferred_visit_date }
 */
router.patch(
  '/:id/reschedule',
  authenticate,
  requireRole('Client'),
  controller.rescheduleBooking,
);

module.exports = router;
