// src/controllers/reportController.js
const path          = require('path');
const fs            = require('fs');
const { query, withTransaction } = require('../config/db');
const aiService     = require('../services/aiService');
const pdfGenerator  = require('../utils/pdfGenerator');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Verify that the current user is assigned (Active) to the given booking.
 */
const isAssignedToBooking = async (bookingId, userId) => {
  const [rows] = await query(
    `SELECT id FROM assignments
     WHERE booking_id    = ?
       AND staff_user_id = ?
       AND status        = 'Active'
     LIMIT 1`,
    [bookingId, userId]
  );
  return rows && rows.length > 0;
};

/**
 * Fetch the client user_id for a booking (used for client access check).
 */
const getBookingClientUserId = async (bookingId) => {
  const [rows] = await query(
    `SELECT c.user_id
     FROM bookings b
     JOIN clients  c ON c.id = b.client_id
     WHERE b.id = ?
     LIMIT 1`,
    [bookingId]
  );
  return rows && rows.length > 0 ? rows[0].user_id : null;
};

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /reports
 * Designer / Site Engineer only (must be assigned to the booking).
 * Creates or updates the visit report + bulk-inserts measurements.
 */
const createReport = async (req, res) => {
  try {
    const {
      booking_id,
      visit_date,
      observations,
      design_suggestions,
      material_suggestions,
      budget_estimate,
      summary,
      follow_up_notes,
      measurements = [],
    } = req.body;

    const userId = req.user.id;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id is required.',
        data: null,
      });
    }

    // Validate booking exists
    const [bookingRows] = await query(
      `SELECT id, status, booking_ref FROM bookings WHERE id = ? LIMIT 1`,
      [booking_id]
    );
    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
        data: null,
      });
    }
    const booking = bookingRows[0];

    // Must be assigned to this booking
    const assigned = await isAssignedToBooking(booking_id, userId);
    if (!assigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this booking.',
        data: null,
      });
    }

    // Auto-generate AI summary if not provided
    let finalSummary = summary || null;
    if (!finalSummary && observations) {
      try {
        finalSummary = await aiService.generateVisitSummary({
          observations,
          design_suggestions,
          material_suggestions,
          budget_estimate,
        });
      } catch (aiErr) {
        console.warn('[createReport] AI summary generation failed:', aiErr.message);
        finalSummary = null;
      }
    }

    let reportId;
    let isUpdate = false;

    await withTransaction(async (conn) => {
      // Check if report already exists for this booking
      const [[existingReport]] = await conn.execute(
        `SELECT id FROM visit_reports WHERE booking_id = ? LIMIT 1`,
        [booking_id]
      );

      if (existingReport) {
        // Update existing report
        isUpdate = true;
        reportId = existingReport.id;

        await conn.execute(
          `UPDATE visit_reports
           SET visit_date           = ?,
               observations         = ?,
               design_suggestions   = ?,
               material_suggestions = ?,
               budget_estimate      = ?,
               summary              = ?,
               follow_up_notes      = ?,
               updated_at           = NOW()
           WHERE id = ?`,
          [
            visit_date          || null,
            observations        || null,
            design_suggestions  || null,
            material_suggestions|| null,
            budget_estimate     || null,
            finalSummary,
            follow_up_notes     || null,
            reportId,
          ]
        );
      } else {
        // Insert new report
        const [insertResult] = await conn.execute(
          `INSERT INTO visit_reports
             (booking_id, submitted_by_user_id, visit_date, observations,
              design_suggestions, material_suggestions, budget_estimate,
              summary, follow_up_notes, is_pdf_generated, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [
            booking_id,
            userId,
            visit_date          || null,
            observations        || null,
            design_suggestions  || null,
            material_suggestions|| null,
            budget_estimate     || null,
            finalSummary,
            follow_up_notes     || null,
          ]
        );
        reportId = insertResult.insertId;
      }

      // Bulk insert measurements
      if (measurements.length > 0) {
        // Delete existing measurements for this report first
        await conn.execute(
          `DELETE FROM measurements WHERE visit_report_id = ?`,
          [reportId]
        );

        const measurementValues = measurements.map((m) => [
          reportId,
          m.room_name    || null,
          m.length_ft    || null,
          m.width_ft     || null,
          m.height_ft    || null,
          m.notes        || null,
        ]);

        for (const vals of measurementValues) {
          await conn.execute(
            `INSERT INTO measurements
               (visit_report_id, room_name, length_ft, width_ft, height_ft, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            vals
          );
        }
      }

      // Update booking status to 'Completed' if it was 'In Progress'
      if (booking.status === 'In Progress') {
        await conn.execute(
          `UPDATE bookings
           SET status       = 'Completed',
               completed_at = NOW(),
               updated_at   = NOW()
           WHERE id = ?`,
          [booking_id]
        );
      }

      // Activity log
      await conn.execute(
        `INSERT INTO activity_logs
           (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, ?, 'visit_report', ?, ?, ?, ?)`,
        [
          userId,
          isUpdate ? 'UPDATE_VISIT_REPORT' : 'CREATE_VISIT_REPORT',
          reportId,
          JSON.stringify({ booking_id, booking_ref: booking.booking_ref, measurementCount: measurements.length }),
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );
    });

    // Fetch full report with measurements
    const [reportRows] = await query(
      `SELECT * FROM visit_reports WHERE id = ?`,
      [reportId]
    );
    const report = reportRows[0];

    const [measurementRows] = await query(
      `SELECT * FROM measurements WHERE visit_report_id = ?`,
      [reportId]
    );

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? 'Visit report updated successfully.'
        : 'Visit report created successfully.',
      data: { ...report, measurements: measurementRows },
    });
  } catch (err) {
    console.error('[reportController.createReport]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating/updating report.',
      data: null,
    });
  }
};

/**
 * GET /reports/booking/:bookingId
 * Admin / Assigned Staff / Client (own booking).
 */
const getReport = async (req, res) => {
  try {
    const bookingId   = parseInt(req.params.bookingId, 10);
    const currentUser = req.user;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
        data: null,
      });
    }

    // Access control
    if (currentUser.role_id !== 1) {
      // Designer / Site Engineer: must be assigned
      if (currentUser.role_id === 3 || currentUser.role_id === 4) {
        const assigned = await isAssignedToBooking(bookingId, currentUser.id);
        if (!assigned) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not assigned to this booking.',
            data: null,
          });
        }
      } else if (currentUser.role_id === 2) {
        // Client: must own the booking
        const clientUserId = await getBookingClientUserId(bookingId);
        if (clientUserId !== currentUser.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This booking does not belong to you.',
            data: null,
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied.',
          data: null,
        });
      }
    }

    const [reportRows] = await query(
      `SELECT
         vr.*,
         u.full_name AS submitted_by_name
       FROM visit_reports vr
       JOIN users u ON u.id = vr.submitted_by_user_id
       WHERE vr.booking_id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (!reportRows || reportRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No report found for this booking.',
        data: null,
      });
    }
    const report = reportRows[0];

    const [measurements] = await query(
      `SELECT * FROM measurements WHERE visit_report_id = ? ORDER BY id ASC`,
      [report.id]
    );

    const [photos] = await query(
      `SELECT * FROM site_photos WHERE visit_report_id = ? ORDER BY uploaded_at DESC`,
      [report.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Report fetched successfully.',
      data: { ...report, measurements, photos },
    });
  } catch (err) {
    console.error('[reportController.getReport]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching report.',
      data: null,
    });
  }
};

/**
 * POST /reports/measurements
 * Designer / Site Engineer (assigned) – replace all measurements for a report.
 */
const addMeasurements = async (req, res) => {
  try {
    const { visit_report_id, measurements = [] } = req.body;
    const userId = req.user.id;

    if (!visit_report_id) {
      return res.status(400).json({
        success: false,
        message: 'visit_report_id is required.',
        data: null,
      });
    }

    if (!Array.isArray(measurements) || measurements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'measurements array is required and cannot be empty.',
        data: null,
      });
    }

    // Fetch report and verify user is assigned to its booking
    const [reportRows] = await query(
      `SELECT id, booking_id FROM visit_reports WHERE id = ? LIMIT 1`,
      [visit_report_id]
    );
    if (!reportRows || reportRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visit report not found.',
        data: null,
      });
    }
    const report = reportRows[0];

    const assigned = await isAssignedToBooking(report.booking_id, userId);
    if (!assigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this booking.',
        data: null,
      });
    }

    await withTransaction(async (conn) => {
      // Delete all existing measurements
      await conn.execute(
        `DELETE FROM measurements WHERE visit_report_id = ?`,
        [visit_report_id]
      );

      // Bulk insert new measurements
      for (const m of measurements) {
        await conn.execute(
          `INSERT INTO measurements
             (visit_report_id, room_name, length_ft, width_ft, height_ft, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            visit_report_id,
            m.room_name  || null,
            m.length_ft  || null,
            m.width_ft   || null,
            m.height_ft  || null,
            m.notes      || null,
          ]
        );
      }

      // Update report timestamp
      await conn.execute(
        `UPDATE visit_reports SET updated_at = NOW() WHERE id = ?`,
        [visit_report_id]
      );
    });

    const [newMeasurements] = await query(
      `SELECT * FROM measurements WHERE visit_report_id = ? ORDER BY id ASC`,
      [visit_report_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Measurements updated successfully.',
      data: newMeasurements,
    });
  } catch (err) {
    console.error('[reportController.addMeasurements]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating measurements.',
      data: null,
    });
  }
};

/**
 * GET /reports/booking/:bookingId/export
 * Admin / Assigned Staff / Client (own booking) – stream PDF.
 */
const exportReportPDF = async (req, res) => {
  try {
    const bookingId   = parseInt(req.params.bookingId, 10);
    const currentUser = req.user;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
        data: null,
      });
    }

    // Access control
    if (currentUser.role_id !== 1) {
      if (currentUser.role_id === 3 || currentUser.role_id === 4) {
        const assigned = await isAssignedToBooking(bookingId, currentUser.id);
        if (!assigned) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not assigned to this booking.',
            data: null,
          });
        }
      } else if (currentUser.role_id === 2) {
        const clientUserId = await getBookingClientUserId(bookingId);
        if (clientUserId !== currentUser.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This booking does not belong to you.',
            data: null,
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied.',
          data: null,
        });
      }
    }

    // Fetch full report data
    const [reportRows] = await query(
      `SELECT
         vr.*,
         u.full_name          AS submitted_by_name,
         b.booking_ref,
         b.property_type,
         b.address            AS site_address,
         b.city               AS site_city,
         b.pincode            AS site_pincode,
         b.preferred_visit_date,
         b.num_rooms,
         b.estimated_budget,
         b.project_description,
         b.status             AS booking_status,
         pt.name              AS project_type,
         cu.full_name         AS client_name,
         cu.email             AS client_email,
         cu.mobile_number     AS client_mobile,
         cl.address           AS client_address,
         cl.city              AS client_city
       FROM visit_reports vr
       JOIN users         u   ON u.id   = vr.submitted_by_user_id
       JOIN bookings      b   ON b.id   = vr.booking_id
       JOIN project_types pt  ON pt.id  = b.project_type_id
       JOIN clients       cl  ON cl.id  = b.client_id
       JOIN users         cu  ON cu.id  = cl.user_id
       WHERE vr.booking_id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (!reportRows || reportRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No report found for this booking.',
        data: null,
      });
    }
    const report = reportRows[0];

    const [measurements] = await query(
      `SELECT * FROM measurements WHERE visit_report_id = ? ORDER BY id ASC`,
      [report.id]
    );

    const [photos] = await query(
      `SELECT * FROM site_photos WHERE visit_report_id = ? ORDER BY uploaded_at ASC`,
      [report.id]
    );

    // Build the full report payload for PDF generation
    const reportPayload = {
      ...report,
      measurements,
      photos,
    };

    // Generate PDF
    const pdfDir = path.join(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFileName = `report_booking_${bookingId}_${Date.now()}.pdf`;
    const pdfPath     = path.join(pdfDir, pdfFileName);

    await pdfGenerator.generateVisitReport(reportPayload, pdfPath);

    // Persist pdf_path in visit_reports table
    const relativePath = path.join('storage', 'reports', pdfFileName);
    await query(
      `UPDATE visit_reports
       SET is_pdf_generated = 1,
           pdf_path         = ?,
           updated_at       = NOW()
       WHERE id = ?`,
      [relativePath, report.id]
    );

    // Stream the PDF to the client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="visit_report_${report.booking_ref}.pdf"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.on('error', (streamErr) => {
      console.error('[exportReportPDF] Stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming PDF file.',
          data: null,
        });
      }
    });
    fileStream.pipe(res);
  } catch (err) {
    console.error('[reportController.exportReportPDF]', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error while exporting PDF.',
        data: null,
      });
    }
  }
};

module.exports = {
  createReport,
  getReport,
  addMeasurements,
  exportReportPDF,
};
