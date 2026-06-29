// src/routes/report.routes.js
const express = require('express');
const router  = express.Router();
const { authenticate }              = require('../middleware/authMiddleware');
const { requireAnyRole }            = require('../middleware/roleMiddleware');
const {
  createReport,
  getReport,
  addMeasurements,
  exportReportPDF,
} = require('../controllers/reportController');

/**
 * POST /api/reports
 * Designer / Site Engineer (must be assigned to the booking).
 * Creates or updates the visit report and bulk-inserts measurements.
 * Body: {
 *   booking_id, visit_date?, observations?, design_suggestions?,
 *   material_suggestions?, budget_estimate?, summary?,
 *   follow_up_notes?, measurements: [{ room_name, length_ft, width_ft, height_ft, notes? }]
 * }
 */
router.post(
  '/',
  authenticate,
  requireAnyRole('Designer', 'Site Engineer'),
  createReport
);

/**
 * POST /api/reports/measurements
 * Designer / Site Engineer (assigned) – replace all measurements for an existing report.
 * Body: {
 *   visit_report_id,
 *   measurements: [{ room_name, length_ft, width_ft, height_ft, notes? }]
 * }
 * NOTE: Defined before /booking/:bookingId to prevent Express treating
 *       "measurements" as the :bookingId param.
 */
router.post(
  '/measurements',
  authenticate,
  requireAnyRole('Designer', 'Site Engineer'),
  addMeasurements
);

/**
 * GET /api/reports/booking/:bookingId/export
 * Admin / Assigned Staff / Client (own booking) – generate and stream PDF.
 * NOTE: Defined before /booking/:bookingId so Express does not
 *       shadow the /export sub-path.
 */
router.get(
  '/booking/:bookingId/export',
  authenticate,
  exportReportPDF
);

/**
 * GET /api/reports/booking/:bookingId
 * Admin / Assigned Staff / Client (own booking) – full report with
 * measurements array and photos array.
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  getReport
);

module.exports = router;
