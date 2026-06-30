/**
 * Glory Simon Interiors - Site Visit Booking System
 * Booking Controller
 *
 * Handles: createBooking, getAllBookings, getBookingById, updateBookingStatus,
 *          cancelBooking, getMyBookings, rescheduleBooking
 */

'use strict';

const { v4: uuidv4 }             = require('uuid');
const { query, withTransaction } = require('../config/db');
const { computePriority }        = require('../utils/priorityEngine');
const emailService               = require('../services/emailService');
const whatsappService            = require('../services/whatsappService');

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Allowed booking status values */
const VALID_STATUSES = [
  'Pending', 'Confirmed', 'Assigned', 'Scheduled',
  'In Progress', 'Completed', 'Cancelled',
];

/**
 * Valid status transitions map.
 * Key = current status → Value = array of allowed next statuses.
 */
const STATUS_TRANSITIONS = {
  'Pending'    : ['Confirmed', 'Cancelled'],
  'Confirmed'  : ['Assigned', 'Cancelled'],
  'Assigned'   : ['Scheduled', 'Cancelled'],
  'Scheduled'  : ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed'  : [],
  'Cancelled'  : [],
};

/** Roles that can advance bookings through all major states */
const ADMIN_ROLE_ID    = 1;
const CLIENT_ROLE_ID   = 2;
const DESIGNER_ROLE_ID = 3;
const ENGINEER_ROLE_ID = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a unique booking reference like GS-20260616-XXXX */
function generateBookingRef() {
  const today  = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = uuidv4().toUpperCase().replace(/-/g, '').slice(0, 6);
  return `GS-${yyyymmdd}-${suffix}`;
}

/** Log an activity entry (non-fatal) */
async function logActivity({ userId, action, entityType, entityId, details, req }) {
  try {
    const ip        = (req && (req.ip || req.headers['x-forwarded-for'])) || null;
    const userAgent = (req && req.headers['user-agent']) || null;
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId, JSON.stringify(details || {}), ip, userAgent],
    );
  } catch (_) { /* non-fatal */ }
}

/** Create an in-app notification (non-fatal) */
async function createNotification({ userId, bookingId, title, message, type = 'In-App' }) {
  try {
    await query(
      `INSERT INTO notifications (user_id, booking_id, title, message, type, status, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 'Pending', 0, NOW())`,
      [userId, bookingId, title, message, type],
    );
  } catch (_) { /* non-fatal */ }
}

/**
 * Validate booking form fields and return the first error message, or null.
 */
function validateBookingPayload(body) {
  const {
    property_type, project_type_id, address, city, pincode,
    preferred_visit_date, slot_id, num_rooms, estimated_budget, project_description,
  } = body;

  if (!property_type || !['Residential', 'Commercial'].includes(property_type)) {
    return 'property_type must be one of: Residential, Commercial.';
  }
  if (!project_type_id || isNaN(Number(project_type_id))) {
    return 'A valid project_type_id is required.';
  }
  if (!address || address.trim().length < 5) {
    return 'Property address must be at least 5 characters.';
  }
  if (!city || city.trim().length < 2) {
    return 'City is required.';
  }
  if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
    return 'Pincode must be a 6-digit number.';
  }
  if (!preferred_visit_date || isNaN(Date.parse(preferred_visit_date))) {
    return 'A valid preferred_visit_date (YYYY-MM-DD) is required.';
  }
  // Date must not be in the past
  const visitDate = new Date(preferred_visit_date);
  visitDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (visitDate < today) {
    return 'preferred_visit_date cannot be in the past.';
  }
  if (!slot_id || isNaN(Number(slot_id))) {
    return 'A valid slot_id is required.';
  }
  if (!num_rooms || isNaN(Number(num_rooms)) || Number(num_rooms) < 1) {
    return 'num_rooms must be a positive integer.';
  }
  if (!estimated_budget || isNaN(Number(estimated_budget)) || Number(estimated_budget) < 0) {
    return 'estimated_budget must be a non-negative number.';
  }
  if (!project_description || project_description.trim().length < 10) {
    return 'project_description must be at least 10 characters.';
  }
  return null;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Create a new site-visit booking (Client only).
 */
async function createBooking(req, res) {
  const clientUserId = req.user.id;

  // 1. Validate payload
  const validationError = validateBookingPayload(req.body);
  if (validationError) {
    return res.status(422).json({ success: false, message: validationError });
  }

  const {
    property_type,
    project_type_id,
    address,
    city,
    pincode,
    preferred_visit_date,
    slot_id,
    num_rooms,
    estimated_budget,
    project_description,
    email, // optional for Client, required for Admin booking
  } = req.body;

  try {
    let clientId;
    if (req.user.role_name === 'Admin') {
      const targetEmail = email || req.body.client_email;
      if (!targetEmail) {
        return res.status(400).json({ success: false, message: 'Client email is required for administrator bookings.' });
      }
      const [clientRows] = await query(
        `SELECT c.id FROM clients c
         JOIN users u ON c.user_id = u.id
         WHERE u.email = ? LIMIT 1`,
        [targetEmail.trim()]
      );
      if (clientRows.length === 0) {
        return res.status(404).json({ success: false, message: `No client account found with email "${targetEmail}".` });
      }
      clientId = clientRows[0].id;
    } else {
      // Client role - get client profile of logged-in user
      const [clientRows] = await query(
        'SELECT id FROM clients WHERE user_id = ? LIMIT 1',
        [req.user.id],
      );
      if (clientRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Client profile not found. Please contact support.' });
      }
      clientId = clientRows[0].id;
    }

    // 3. Verify project type exists and is active
    const [ptRows] = await query(
      'SELECT id, name FROM project_types WHERE id = ? AND is_active = 1 LIMIT 1',
      [Number(project_type_id)],
    );
    if (ptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'The selected project type does not exist or is inactive.' });
    }

    // 4. Verify slot exists, is active, and has available capacity
    const [slotRows] = await query(
      `SELECT id, slot_date, start_time, end_time, max_bookings, current_bookings, is_active
       FROM slots
       WHERE id = ? LIMIT 1`,
      [Number(slot_id)],
    );
    if (slotRows.length === 0) {
      return res.status(404).json({ success: false, message: 'The selected time slot does not exist.' });
    }
    const slot = slotRows[0];
    if (!slot.is_active) {
      return res.status(409).json({ success: false, message: 'The selected time slot is no longer active.' });
    }
    if (slot.current_bookings >= slot.max_bookings) {
      return res.status(409).json({ success: false, message: 'The selected time slot is fully booked. Please choose another.' });
    }

    // 5. Compute booking priority
    const priority = computePriority({
      estimated_budget: Number(estimated_budget),
      num_rooms        : Number(num_rooms),
      property_type,
      preferred_visit_date,
    });

    // 6. Generate unique booking reference
    const bookingRef = generateBookingRef();

    // 7. Insert booking + increment slot counter within a transaction
    const newBookingId = await withTransaction(async (conn) => {
      const [bookingResult] = await conn.execute(
        `INSERT INTO bookings
           (booking_ref, client_id, property_type, project_type_id, address, city, pincode,
            preferred_visit_date, slot_id, num_rooms, estimated_budget, project_description,
            status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW(), NOW())`,
        [
          bookingRef,
          clientId,
          property_type,
          Number(project_type_id),
          address.trim(),
          city.trim(),
          pincode.trim(),
          preferred_visit_date,
          Number(slot_id),
          Number(num_rooms),
          Number(estimated_budget),
          project_description.trim(),
          priority,
        ],
      );

      const bookingId = bookingResult.insertId;

      // Increment slot current_bookings
      await conn.execute(
        'UPDATE slots SET current_bookings = current_bookings + 1 WHERE id = ?',
        [Number(slot_id)],
      );

      return bookingId;
    });

    // 8. Fetch full booking details to return
    const [bookingRows] = await query(
      `SELECT b.*, pt.name AS project_type_name,
              s.slot_date, s.start_time, s.end_time
       FROM bookings b
       JOIN project_types pt ON b.project_type_id = pt.id
       JOIN slots s ON b.slot_id = s.id
       WHERE b.id = ?`,
      [newBookingId],
    );
    const booking = bookingRows[0];

    // 9. Fetch client user info for notifications (resolving client's user ID from clients table)
    const [userRows] = await query(
      `SELECT u.id, u.full_name, u.email, u.mobile_number 
       FROM users u
       JOIN clients c ON c.user_id = u.id
       WHERE c.id = ? LIMIT 1`,
      [clientId],
    );
    const clientUser = userRows[0];

    // 10. Send email & WhatsApp confirmation (non-fatal)
    try {
      await emailService.sendBookingConfirmation({
        to      : clientUser.email,
        name    : clientUser.full_name,
        booking,
      });
    } catch (emailErr) {
      console.warn('[createBooking] Email notification failed:', emailErr.message);
    }

    try {
      await whatsappService.sendBookingConfirmation({
        mobile  : clientUser.mobile_number,
        name    : clientUser.full_name,
        booking,
      });
    } catch (waErr) {
      console.warn('[createBooking] WhatsApp notification failed:', waErr.message);
    }

    // 11. Create in-app notification for the client
    await createNotification({
      userId   : clientUser.id,
      bookingId: newBookingId,
      title    : 'Booking Confirmed',
      message  : `Your site visit booking ${bookingRef} has been received and is pending confirmation.`,
    });

    // 12. Log activity
    await logActivity({
      userId    : clientUserId,
      action    : 'BOOKING_CREATED',
      entityType: 'bookings',
      entityId  : newBookingId,
      details   : { booking_ref: bookingRef, priority },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Your site visit booking has been submitted successfully.',
      booking,
      data   : booking,
    });
  } catch (err) {
    console.error('[bookingController.createBooking]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create booking. Please try again.' });
  }
}

/**
 * GET /api/bookings
 * Retrieve all bookings with filters, search, pagination.
 * Admin, Designer, Site Engineer only.
 */
async function getAllBookings(req, res) {
  const {
    status,
    priority,
    city,
    project_type_id,
    search,        // booking_ref | client name | mobile_number
    page        = '1',
    limit       = '20',
    sort_by     = 'created_at',
    sort_order  = 'DESC',
  } = req.query;

  // Sanitise pagination
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset   = (pageNum - 1) * limitNum;

  // Whitelist sort columns to prevent SQL injection
  const ALLOWED_SORT_COLUMNS = [
    'created_at', 'updated_at', 'preferred_visit_date',
    'status', 'priority', 'booking_ref', 'city',
  ];
  const sortCol = ALLOWED_SORT_COLUMNS.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  try {
    // Build dynamic WHERE clauses
    const conditions = [];
    const params     = [];

    // Role-based authorization & filtering (determined strictly from JWT token)
    const userRole = req.user.role_name;
    const userId = req.user.id;

    if (userRole === 'Client') {
      conditions.push('client_user_id = ?');
      params.push(userId);
    } else if (userRole === 'Designer') {
      conditions.push('designer_user_id = ?');
      params.push(userId);
    } else if (userRole === 'Site Engineer') {
      conditions.push('engineer_user_id = ?');
      params.push(userId);
    }

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (priority && ['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
      conditions.push('priority = ?');
      params.push(priority);
    }
    if (city) {
      conditions.push('city LIKE ?');
      params.push(`%${city.trim()}%`);
    }
    if (project_type_id && !isNaN(Number(project_type_id))) {
      conditions.push('project_type_id = ?');
      params.push(Number(project_type_id));
    }
    if (search && search.trim()) {
      conditions.push('(booking_ref LIKE ? OR client_name LIKE ? OR client_mobile LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const [countRows] = await query(
      `SELECT COUNT(*) AS total FROM v_bookings_summary ${whereClause}`,
      params,
    );
    const total = countRows[0].total;

    // Data query
    const dataParams = [...params, limitNum, offset];
    const [bookings] = await query(
      `SELECT *
       FROM v_bookings_summary
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      dataParams,
    );

    return res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully.',
      data: {
        bookings,
        pagination: {
          total,
          page      : pageNum,
          limit     : limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    console.error('[bookingController.getAllBookings]', err.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve bookings.' });
  }
}

/**
 * GET /api/bookings/:id
 * Get a single booking's full details.
 * Admin/Staff: any booking. Client: only their own.
 */
async function getBookingById(req, res) {
  const bookingId  = parseInt(req.params.id, 10);
  const { id: userId, role_id } = req.user;

  if (isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
  }

  try {
    // 1. Fetch booking
    const [bookingRows] = await query(
      `SELECT b.*, pt.name AS project_type_name,
              s.slot_date, s.start_time, s.end_time,
              u.full_name AS client_full_name, u.email AS client_email, u.mobile_number AS client_mobile,
              c.address AS client_address, c.city AS client_city, c.pincode AS client_pincode
       FROM bookings b
       JOIN project_types pt ON b.project_type_id = pt.id
       JOIN slots s          ON b.slot_id = s.id
       JOIN clients cl       ON b.client_id = cl.id
       JOIN users u          ON cl.user_id = u.id
       JOIN clients c        ON cl.id = c.id
       WHERE b.id = ?`,
      [bookingId],
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRows[0];

    // 2. Access control: client can only see their own bookings
    if (role_id === CLIENT_ROLE_ID) {
      const [clientCheck] = await query(
        'SELECT id FROM clients WHERE user_id = ? AND id = ? LIMIT 1',
        [userId, booking.client_id],
      );
      if (clientCheck.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking does not belong to you.' });
      }
    }

    // 3. Fetch assignments
    const [assignments] = await query(
      `SELECT a.id, a.staff_role, a.assignment_date, a.status, a.notes,
              u.full_name AS staff_name, u.email AS staff_email, u.mobile_number AS staff_mobile
       FROM assignments a
       JOIN users u ON a.staff_user_id = u.id
       WHERE a.booking_id = ?
       ORDER BY a.assignment_date DESC`,
      [bookingId],
    );

    // 4. Check if a visit report exists
    const [reportRows] = await query(
      'SELECT id FROM visit_reports WHERE booking_id = ? LIMIT 1',
      [bookingId],
    );
    const hasVisitReport = reportRows.length > 0;
    const visitReportId  = hasVisitReport ? reportRows[0].id : null;

    // 5. Fetch follow-ups
    const [followups] = await query(
      `SELECT f.id, f.follow_up_date, f.notes, f.status, f.completed_at,
              u.full_name AS scheduled_by
       FROM followups f
       JOIN users u ON f.scheduled_by_user_id = u.id
       WHERE f.booking_id = ?
       ORDER BY f.follow_up_date DESC`,
      [bookingId],
    );

    return res.status(200).json({
      success: true,
      message: 'Booking details retrieved successfully.',
      data: {
        ...booking,
        assignments,
        followups,
        has_visit_report: hasVisitReport,
        visit_report_id : visitReportId,
      },
    });
  } catch (err) {
    console.error('[bookingController.getBookingById]', err.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve booking details.' });
  }
}

/**
 * PATCH /api/bookings/:id/status
 * Update booking status with transition validation.
 * Admin: all transitions. Designer/Engineer: only In Progress, Completed.
 */
async function updateBookingStatus(req, res) {
  const bookingId = parseInt(req.params.id, 10);
  const { status: newStatus } = req.body;
  const { id: userId, role_id } = req.user;

  if (isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
  }
  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return res.status(422).json({
      success: false,
      message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
    });
  }

  try {
    // 1. Fetch current booking
    const [rows] = await query(
      'SELECT id, status, client_id FROM bookings WHERE id = ? LIMIT 1',
      [bookingId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking       = rows[0];
    const currentStatus = booking.status;

    // 2. Validate transition
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(409).json({
        success: false,
        message: `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}.`,
      });
    }

    // 3. Role-based restriction: Designer/Engineer can only set In Progress or Completed
    if (role_id === DESIGNER_ROLE_ID || role_id === ENGINEER_ROLE_ID) {
      if (!['In Progress', 'Completed'].includes(newStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Staff members can only set status to "In Progress" or "Completed".',
        });
      }
      // Verify they are actually assigned to this booking
      const [assignCheck] = await query(
        'SELECT id FROM assignments WHERE booking_id = ? AND staff_user_id = ? AND status = "Active" LIMIT 1',
        [bookingId, userId],
      );
      if (assignCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this booking.',
        });
      }
    }

    // 4. Build UPDATE statement with conditional timestamp fields
    const extraSets = [];
    const extraParams = [];

    if (newStatus === 'Confirmed') {
      extraSets.push('confirmed_at = NOW()');
    }
    if (newStatus === 'Completed') {
      extraSets.push('completed_at = NOW()');
    }

    const setClause = [`status = ?`, `updated_at = NOW()`, ...extraSets].join(', ');

    await query(
      `UPDATE bookings SET ${setClause} WHERE id = ?`,
      [newStatus, ...extraParams, bookingId],
    );

    // 5. Notify client
    const [clientRows] = await query(
      `SELECT u.id AS user_id, u.full_name, u.email, u.mobile_number
       FROM clients cl
       JOIN users u ON cl.user_id = u.id
       WHERE cl.id = ?`,
      [booking.client_id],
    );

    if (clientRows.length > 0) {
      const clientUser = clientRows[0];
      await createNotification({
        userId   : clientUser.user_id,
        bookingId,
        title    : `Booking Status Updated: ${newStatus}`,
        message  : `Your booking #${bookingId} status has been updated to "${newStatus}".`,
        type     : 'In-App',
      });

      // Email notification (non-fatal)
      try {
        await emailService.sendStatusUpdate({
          to    : clientUser.email,
          name  : clientUser.full_name,
          bookingId,
          status: newStatus,
        });
      } catch (_) { /* non-fatal */ }
    }

    // 6. Log activity
    await logActivity({
      userId,
      action    : 'BOOKING_STATUS_UPDATED',
      entityType: 'bookings',
      entityId  : bookingId,
      details   : { from: currentStatus, to: newStatus },
      req,
    });

    // 7. Return updated booking
    const [updated] = await query(
      `SELECT b.*, pt.name AS project_type_name
       FROM bookings b
       JOIN project_types pt ON b.project_type_id = pt.id
       WHERE b.id = ?`,
      [bookingId],
    );

    return res.status(200).json({
      success: true,
      message: `Booking status updated to "${newStatus}".`,
      data   : updated[0],
    });
  } catch (err) {
    console.error('[bookingController.updateBookingStatus]', err.message);
    return res.status(500).json({ success: false, message: 'Could not update booking status.' });
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking.
 * Client: can cancel their own Pending/Confirmed bookings.
 * Admin: can cancel any booking.
 */
async function cancelBooking(req, res) {
  const bookingId = parseInt(req.params.id, 10);
  const { cancellation_reason } = req.body;
  const { id: userId, role_id } = req.user;

  if (isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
  }
  if (!cancellation_reason || cancellation_reason.trim().length < 5) {
    return res.status(422).json({ success: false, message: 'A cancellation reason (min 5 characters) is required.' });
  }

  try {
    // 1. Fetch booking
    const [rows] = await query(
      'SELECT id, status, client_id, slot_id FROM bookings WHERE id = ? LIMIT 1',
      [bookingId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    // 2. Role check
    if (role_id === CLIENT_ROLE_ID) {
      // Client: must own the booking
      const [clientCheck] = await query(
        'SELECT id FROM clients WHERE user_id = ? AND id = ? LIMIT 1',
        [userId, booking.client_id],
      );
      if (clientCheck.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking does not belong to you.' });
      }
      // Client: can only cancel Pending or Confirmed
      if (!['Pending', 'Confirmed'].includes(booking.status)) {
        return res.status(409).json({
          success: false,
          message: `Bookings with status "${booking.status}" cannot be cancelled by the client.`,
        });
      }
    }

    // 3. Check booking isn't already cancelled or completed
    if (['Cancelled', 'Completed'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `This booking is already "${booking.status}" and cannot be cancelled.`,
      });
    }

    // 4. Cancel booking and release slot count within a transaction
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE bookings
         SET status = 'Cancelled', cancellation_reason = ?, updated_at = NOW()
         WHERE id = ?`,
        [cancellation_reason.trim(), bookingId],
      );

      // Decrement slot count only if slot is still counted
      if (booking.slot_id) {
        await conn.execute(
          `UPDATE slots
           SET current_bookings = GREATEST(0, current_bookings - 1)
           WHERE id = ?`,
          [booking.slot_id],
        );
      }
    });

    // 5. Notify client if cancelled by admin
    if (role_id === ADMIN_ROLE_ID) {
      const [clientRows] = await query(
        `SELECT u.id AS user_id, u.full_name, u.email
         FROM clients cl JOIN users u ON cl.user_id = u.id
         WHERE cl.id = ?`,
        [booking.client_id],
      );
      if (clientRows.length > 0) {
        await createNotification({
          userId   : clientRows[0].user_id,
          bookingId,
          title    : 'Booking Cancelled',
          message  : `Your booking #${bookingId} has been cancelled. Reason: ${cancellation_reason.trim()}`,
          type     : 'In-App',
        });
      }
    }

    // 6. Log activity
    await logActivity({
      userId,
      action    : 'BOOKING_CANCELLED',
      entityType: 'bookings',
      entityId  : bookingId,
      details   : { previous_status: booking.status, cancellation_reason: cancellation_reason.trim() },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking has been cancelled successfully.',
      data   : { booking_id: bookingId, status: 'Cancelled', cancellation_reason: cancellation_reason.trim() },
    });
  } catch (err) {
    console.error('[bookingController.cancelBooking]', err.message);
    return res.status(500).json({ success: false, message: 'Could not cancel the booking. Please try again.' });
  }
}

/**
 * GET /api/bookings/my
 * Get the authenticated client's own bookings (paginated).
 * Client only.
 */
async function getMyBookings(req, res) {
  const { id: userId } = req.user;
  const {
    status,
    page       = '1',
    limit      = '10',
    sort_by    = 'created_at',
    sort_order = 'DESC',
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset   = (pageNum - 1) * limitNum;

  const ALLOWED_SORT = ['created_at', 'preferred_visit_date', 'status', 'priority'];
  const sortCol = ALLOWED_SORT.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  try {
    // 1. Resolve client_id
    const [clientRows] = await query(
      'SELECT id FROM clients WHERE user_id = ? LIMIT 1',
      [userId],
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client profile not found.' });
    }
    const clientId = clientRows[0].id;

    // 2. Build filters
    const conditions = ['b.client_id = ?'];
    const params     = [clientId];

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 3. Count
    const [countRows] = await query(
      `SELECT COUNT(*) AS total FROM bookings b ${whereClause}`,
      params,
    );
    const total = countRows[0].total;

    // 4. Data
    const [bookings] = await query(
      `SELECT b.id, b.booking_ref, b.property_type, b.city, b.preferred_visit_date,
              b.status, b.priority, b.estimated_budget, b.created_at, b.updated_at,
              b.confirmed_at, b.completed_at,
              pt.name AS project_type_name,
              s.slot_date, s.start_time, s.end_time
       FROM bookings b
       JOIN project_types pt ON b.project_type_id = pt.id
       JOIN slots s           ON b.slot_id = s.id
       ${whereClause}
       ORDER BY b.${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset],
    );

    return res.status(200).json({
      success: true,
      message: 'Your bookings retrieved successfully.',
      data: {
        bookings,
        pagination: {
          total,
          page      : pageNum,
          limit     : limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    console.error('[bookingController.getMyBookings]', err.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve your bookings.' });
  }
}

/**
 * PATCH /api/bookings/:id/reschedule
 * Client reschedules a Pending/Confirmed booking to a new valid slot.
 */
async function rescheduleBooking(req, res) {
  const bookingId = parseInt(req.params.id, 10);
  const { slot_id, preferred_visit_date } = req.body;
  const { id: userId } = req.user;

  if (isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
  }
  if (!slot_id || isNaN(Number(slot_id))) {
    return res.status(422).json({ success: false, message: 'A valid new slot_id is required.' });
  }
  if (!preferred_visit_date || isNaN(Date.parse(preferred_visit_date))) {
    return res.status(422).json({ success: false, message: 'A valid preferred_visit_date (YYYY-MM-DD) is required.' });
  }

  const visitDate = new Date(preferred_visit_date);
  visitDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (visitDate < today) {
    return res.status(422).json({ success: false, message: 'preferred_visit_date cannot be in the past.' });
  }

  try {
    // 1. Resolve client_id
    const [clientRows] = await query(
      'SELECT id FROM clients WHERE user_id = ? LIMIT 1',
      [userId],
    );
    if (clientRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Client profile not found.' });
    }
    const clientId = clientRows[0].id;

    // 2. Fetch booking
    const [bookingRows] = await query(
      'SELECT id, status, client_id, slot_id FROM bookings WHERE id = ? LIMIT 1',
      [bookingId],
    );
    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRows[0];

    // 3. Ownership check
    if (booking.client_id !== clientId) {
      return res.status(403).json({ success: false, message: 'Access denied. This booking does not belong to you.' });
    }

    // 4. Status check — only Pending or Confirmed bookings can be rescheduled
    if (!['Pending', 'Confirmed'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `Bookings with status "${booking.status}" cannot be rescheduled.`,
      });
    }

    const oldSlotId = booking.slot_id;
    const newSlotId = Number(slot_id);

    // 5. If same slot, just update date (no slot count change needed)
    const isSameSlot = oldSlotId === newSlotId;

    // 6. Validate new slot
    const [newSlotRows] = await query(
      'SELECT id, slot_date, start_time, end_time, max_bookings, current_bookings, is_active FROM slots WHERE id = ? LIMIT 1',
      [newSlotId],
    );
    if (newSlotRows.length === 0) {
      return res.status(404).json({ success: false, message: 'The new time slot does not exist.' });
    }
    const newSlot = newSlotRows[0];
    if (!newSlot.is_active) {
      return res.status(409).json({ success: false, message: 'The selected time slot is no longer active.' });
    }
    // If different slot, check capacity
    if (!isSameSlot && newSlot.current_bookings >= newSlot.max_bookings) {
      return res.status(409).json({ success: false, message: 'The selected time slot is fully booked. Please choose another.' });
    }

    // 7. Perform reschedule within a transaction
    await withTransaction(async (conn) => {
      // Update booking
      await conn.execute(
        `UPDATE bookings
         SET slot_id = ?, preferred_visit_date = ?, updated_at = NOW()
         WHERE id = ?`,
        [newSlotId, preferred_visit_date, bookingId],
      );

      if (!isSameSlot) {
        // Release old slot
        await conn.execute(
          'UPDATE slots SET current_bookings = GREATEST(0, current_bookings - 1) WHERE id = ?',
          [oldSlotId],
        );
        // Increment new slot
        await conn.execute(
          'UPDATE slots SET current_bookings = current_bookings + 1 WHERE id = ?',
          [newSlotId],
        );
      }
    });

    // 8. Create in-app notification
    await createNotification({
      userId   : userId,
      bookingId,
      title    : 'Booking Rescheduled',
      message  : `Your booking #${bookingId} has been rescheduled to ${preferred_visit_date}, slot ${newSlot.start_time}–${newSlot.end_time}.`,
      type     : 'In-App',
    });

    // 9. Log activity
    await logActivity({
      userId,
      action    : 'BOOKING_RESCHEDULED',
      entityType: 'bookings',
      entityId  : bookingId,
      details   : {
        old_slot_id: oldSlotId,
        new_slot_id: newSlotId,
        new_date   : preferred_visit_date,
      },
      req,
    });

    // 10. Return updated booking
    const [updated] = await query(
      `SELECT b.*, pt.name AS project_type_name, s.slot_date, s.start_time, s.end_time
       FROM bookings b
       JOIN project_types pt ON b.project_type_id = pt.id
       JOIN slots s ON b.slot_id = s.id
       WHERE b.id = ?`,
      [bookingId],
    );

    return res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully.',
      data   : updated[0],
    });
  } catch (err) {
    console.error('[bookingController.rescheduleBooking]', err.message);
    return res.status(500).json({ success: false, message: 'Could not reschedule the booking. Please try again.' });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getMyBookings,
  rescheduleBooking,
};
