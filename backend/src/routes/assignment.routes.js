// src/routes/assignment.routes.js
const express = require('express');
const router  = express.Router();
const { authenticate }              = require('../middleware/authMiddleware');
const { requireRole, requireAnyRole } = require('../middleware/roleMiddleware');
const {
  assignStaff,
  reassignStaff,
  getAssignmentsByBooking,
  getMyAssignments,
} = require('../controllers/assignmentController');

/**
 * POST /api/assignments
 * Admin – assign a designer and/or site engineer to a booking.
 * Body: { booking_id, designer_user_id?, engineer_user_id?, notes? }
 */
router.post(
  '/',
  authenticate,
  requireRole('Admin'),
  assignStaff
);

/**
 * PATCH /api/assignments/reassign
 * Admin – reassign a specific staff role on a booking.
 * Body: { booking_id, staff_role, new_staff_user_id, notes? }
 * NOTE: Must be defined before /booking/:bookingId to avoid route conflicts.
 */
router.patch(
  '/reassign',
  authenticate,
  requireRole('Admin'),
  reassignStaff
);

/**
 * GET /api/assignments/my
 * Designer / Site Engineer – paginated list of own active/historical assignments.
 * Query params: ?status=Active|Reassigned|Completed&page=1&limit=10
 */
router.get(
  '/my',
  authenticate,
  requireAnyRole('Designer', 'Site Engineer'),
  getMyAssignments
);

/**
 * GET /api/assignments/booking/:bookingId
 * Admin or assigned staff – all assignments for a specific booking.
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  getAssignmentsByBooking
);

module.exports = router;
