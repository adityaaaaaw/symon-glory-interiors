'use strict';

const { query } = require('../config/db');
const aiService = require('../services/aiService');
const { computePriority } = require('../utils/priorityEngine');

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/priority
// Body: { estimated_budget, property_type, num_rooms }
// ─────────────────────────────────────────────────────────────────────────────
const detectPriority = async (req, res) => {
  try {
    const { estimated_budget, property_type, num_rooms } = req.body;

    if (estimated_budget === undefined || !property_type || num_rooms === undefined) {
      return res.status(400).json({
        success: false,
        message: 'estimated_budget, property_type, and num_rooms are required',
        data: null,
      });
    }

    const budget = parseFloat(estimated_budget) || 0;
    const rooms = parseInt(num_rooms, 10) || 0;

    const priority = computePriority({ estimated_budget: budget, property_type, num_rooms: rooms });

    // Build a human-readable explanation based on the computed priority
    const explanationMap = {
      Urgent: `Priority set to Urgent because the project has a high budget (₹${budget.toLocaleString()}), ${rooms} rooms, and is classified as ${property_type}. Immediate attention required.`,
      High: `Priority set to High due to a significant budget of ₹${budget.toLocaleString()} or a large number of rooms (${rooms}) for a ${property_type} project.`,
      Medium: `Priority set to Medium. Budget of ₹${budget.toLocaleString()} and ${rooms} rooms for a ${property_type} project fall within the standard range.`,
      Low: `Priority set to Low. This is a smaller ${property_type} project with ₹${budget.toLocaleString()} budget and ${rooms} room(s). Can be scheduled at standard priority.`,
    };

    return res.status(200).json({
      success: true,
      message: 'Priority computed successfully',
      data: {
        priority,
        explanation: explanationMap[priority] || `Priority assigned: ${priority}`,
        inputs: { estimated_budget: budget, property_type, num_rooms: rooms },
      },
    });
  } catch (err) {
    console.error('[detectPriority]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute priority',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/summary
// Body: { booking_id } OR { observations, design_suggestions, material_suggestions, measurements }
// ─────────────────────────────────────────────────────────────────────────────
const generateSummary = async (req, res) => {
  try {
    let reportData = {};

    if (req.body.booking_id) {
      const bookingId = parseInt(req.body.booking_id, 10);

      // Fetch visit report for the booking
      const [reportRow] = await query(
        `SELECT vr.id AS visit_report_id, vr.observations, vr.design_suggestions,
                vr.material_suggestions, vr.budget_estimate, vr.follow_up_notes,
                b.booking_ref, b.property_type, b.num_rooms, b.city
         FROM visit_reports vr
         JOIN bookings b ON vr.booking_id = b.id
         WHERE vr.booking_id = ?
         ORDER BY vr.created_at DESC
         LIMIT 1`,
        [bookingId]
      );

      if (!reportRow) {
        return res.status(404).json({
          success: false,
          message: 'No visit report found for this booking',
          data: null,
        });
      }

      // Fetch measurements
      const measurements = await query(
        `SELECT room_name, length_ft, width_ft, height_ft, area_sqft, notes
         FROM measurements
         WHERE visit_report_id = ?`,
        [reportRow.visit_report_id]
      );

      reportData = { ...reportRow, measurements };
    } else {
      // Direct data provided in body
      const { observations, design_suggestions, material_suggestions, measurements } = req.body;

      if (!observations) {
        return res.status(400).json({
          success: false,
          message: 'Either booking_id or observations is required',
          data: null,
        });
      }
      reportData = { observations, design_suggestions, material_suggestions, measurements: measurements || [] };
    }

    const summary = await aiService.generateVisitSummary(reportData);

    return res.status(200).json({
      success: true,
      message: 'Summary generated successfully',
      data: { summary },
    });
  } catch (err) {
    console.error('[generateSummary]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/confirmation
// Body: { booking_id }
// ─────────────────────────────────────────────────────────────────────────────
const generateConfirmation = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id is required',
        data: null,
      });
    }

    // Fetch booking + client + slot details
    const [bookingRow] = await query(
      `SELECT b.id, b.booking_ref, b.status, b.priority,
              b.preferred_visit_date, b.address, b.city, b.pincode,
              b.property_type, b.num_rooms, b.estimated_budget,
              b.project_description,
              pt.name AS project_type,
              u.full_name AS client_name, u.email AS client_email, u.mobile_number AS client_mobile,
              s.slot_date, s.start_time AS slot_start, s.end_time AS slot_end
       FROM bookings b
       JOIN clients c ON b.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       LEFT JOIN slots s ON b.slot_id = s.id
       WHERE b.id = ?`,
      [parseInt(booking_id, 10)]
    );

    if (!bookingRow) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    const { message, whatsapp_message, email_subject } =
      await aiService.generateConfirmationMessage(bookingRow);

    return res.status(200).json({
      success: true,
      message: 'Confirmation message generated successfully',
      data: { message, whatsapp_message, email_subject },
    });
  } catch (err) {
    console.error('[generateConfirmation]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate confirmation message',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/reminder
// Body: { booking_id }
// ─────────────────────────────────────────────────────────────────────────────
const generateReminder = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id is required',
        data: null,
      });
    }

    const [bookingRow] = await query(
      `SELECT b.id, b.booking_ref, b.preferred_visit_date,
              b.address, b.city,
              pt.name AS project_type,
              u.full_name AS client_name, u.mobile_number AS client_mobile,
              s.slot_date, s.start_time AS slot_start, s.end_time AS slot_end
       FROM bookings b
       JOIN clients c ON b.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       LEFT JOIN slots s ON b.slot_id = s.id
       WHERE b.id = ?`,
      [parseInt(booking_id, 10)]
    );

    if (!bookingRow) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    const { message } = await aiService.generateReminderMessage(bookingRow);

    return res.status(200).json({
      success: true,
      message: 'Reminder message generated successfully',
      data: { message },
    });
  } catch (err) {
    console.error('[generateReminder]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate reminder message',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/follow-up
// Body: { booking_id }
// ─────────────────────────────────────────────────────────────────────────────
const generateFollowUp = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id is required',
        data: null,
      });
    }

    const bookingIdInt = parseInt(booking_id, 10);

    // Fetch latest visit report and measurements
    const [reportRow] = await query(
      `SELECT vr.id AS visit_report_id, vr.observations, vr.design_suggestions,
              vr.material_suggestions, vr.budget_estimate, vr.summary, vr.follow_up_notes,
              b.booking_ref, b.property_type, b.num_rooms, b.city,
              b.estimated_budget, b.project_description,
              pt.name AS project_type
       FROM visit_reports vr
       JOIN bookings b ON vr.booking_id = b.id
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       WHERE vr.booking_id = ?
       ORDER BY vr.created_at DESC
       LIMIT 1`,
      [bookingIdInt]
    );

    if (!reportRow) {
      return res.status(404).json({
        success: false,
        message: 'No visit report found for this booking. A visit report must be submitted before generating follow-up recommendations.',
        data: null,
      });
    }

    const measurements = await query(
      `SELECT room_name, length_ft, width_ft, height_ft, area_sqft, notes
       FROM measurements WHERE visit_report_id = ?`,
      [reportRow.visit_report_id]
    );

    const reportData = { ...reportRow, measurements };

    const { recommendations, next_steps } =
      await aiService.generateFollowUpRecommendation(reportData);

    return res.status(200).json({
      success: true,
      message: 'Follow-up recommendations generated successfully',
      data: { recommendations, next_steps },
    });
  } catch (err) {
    console.error('[generateFollowUp]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate follow-up recommendations',
      data: null,
    });
  }
};

module.exports = {
  detectPriority,
  generateSummary,
  generateConfirmation,
  generateReminder,
  generateFollowUp,
};
