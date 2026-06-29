// src/controllers/assignmentController.js
const { query, withTransaction } = require('../config/db');
const emailService = require('../services/emailService');

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /assignments
 * Admin only – assign a designer and/or site engineer to a booking.
 */
const assignStaff = async (req, res) => {
  try {
    const {
      booking_id,
      designer_user_id,
      engineer_user_id,
      notes,
    } = req.body;

    const adminUserId = req.user.id;

    // At least one must be provided
    if (!designer_user_id && !engineer_user_id) {
      return res.status(400).json({
        success: false,
        message: 'At least one of designer_user_id or engineer_user_id must be provided.',
        data: null,
      });
    }

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

    // Validate designer role (role_id = 3)
    if (designer_user_id) {
      const [designerRows] = await query(
        `SELECT id, role_id, full_name, email FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
        [designer_user_id]
      );
      if (!designerRows || designerRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Designer user not found or inactive.',
          data: null,
        });
      }
      const designer = designerRows[0];
      if (designer.role_id !== 3) {
        return res.status(400).json({
          success: false,
          message: 'Provided designer_user_id does not belong to a Designer role.',
          data: null,
        });
      }
    }

    // Validate engineer role (role_id = 4)
    if (engineer_user_id) {
      const [engineerRows] = await query(
        `SELECT id, role_id, full_name, email FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
        [engineer_user_id]
      );
      if (!engineerRows || engineerRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Site Engineer user not found or inactive.',
          data: null,
        });
      }
      const engineer = engineerRows[0];
      if (engineer.role_id !== 4) {
        return res.status(400).json({
          success: false,
          message: 'Provided engineer_user_id does not belong to a Site Engineer role.',
          data: null,
        });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const createdAssignments = [];

    await withTransaction(async (conn) => {
      // ── Designer assignment ──────────────────────────────────────────────
      if (designer_user_id) {
        // Deactivate any existing active designer assignment
        await conn.execute(
          `UPDATE assignments
           SET status = 'Reassigned'
           WHERE booking_id = ?
             AND staff_role = 'Designer'
             AND status    = 'Active'`,
          [booking_id]
        );

        // Insert new assignment
        const [insertResult] = await conn.execute(
          `INSERT INTO assignments
             (booking_id, staff_role, staff_user_id, assigned_by_user_id, assignment_date, status, notes)
           VALUES (?, 'Designer', ?, ?, ?, 'Active', ?)`,
          [booking_id, designer_user_id, adminUserId, today, notes || null]
        );

        createdAssignments.push({
          id: insertResult.insertId,
          role: 'Designer',
          staff_user_id: designer_user_id,
        });
      }

      // ── Engineer assignment ──────────────────────────────────────────────
      if (engineer_user_id) {
        // Deactivate any existing active engineer assignment
        await conn.execute(
          `UPDATE assignments
           SET status = 'Reassigned'
           WHERE booking_id = ?
             AND staff_role = 'Site Engineer'
             AND status    = 'Active'`,
          [booking_id]
        );

        // Insert new assignment
        const [insertResult] = await conn.execute(
          `INSERT INTO assignments
             (booking_id, staff_role, staff_user_id, assigned_by_user_id, assignment_date, status, notes)
           VALUES (?, 'Site Engineer', ?, ?, ?, 'Active', ?)`,
          [booking_id, engineer_user_id, adminUserId, today, notes || null]
        );

        createdAssignments.push({
          id: insertResult.insertId,
          role: 'Site Engineer',
          staff_user_id: engineer_user_id,
        });
      }

      // ── Update booking status to 'Assigned' if it was 'Confirmed' ───────
      if (booking.status === 'Confirmed') {
        await conn.execute(
          `UPDATE bookings SET status = 'Assigned', updated_at = NOW() WHERE id = ?`,
          [booking_id]
        );
      }

      // ── Activity log ─────────────────────────────────────────────────────
      await conn.execute(
        `INSERT INTO activity_logs
           (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, 'ASSIGN_STAFF', 'booking', ?, ?, ?, ?)`,
        [
          adminUserId,
          booking_id,
          JSON.stringify({ booking_ref: booking.booking_ref, createdAssignments }),
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );
    });

    // ── Send email notifications (outside transaction – best effort) ──────
    for (const asgn of createdAssignments) {
      try {
        const [staffUserRows] = await query(
          `SELECT full_name, email FROM users WHERE id = ? LIMIT 1`,
          [asgn.staff_user_id]
        );
        const staffUser = staffUserRows[0];
        if (staffUser && staffUser.email) {
          await emailService.sendAssignmentNotification({
            to: staffUser.email,
            name: staffUser.full_name,
            role: asgn.role,
            bookingRef: booking.booking_ref,
            bookingId: booking_id,
          });
        }
      } catch (emailErr) {
        console.warn('[assignStaff] Email notification failed:', emailErr.message);
      }
    }

    // Fetch full assignment details to return
    const assignments = await query(
      `SELECT
         a.id,
         a.booking_id,
         a.staff_role,
         a.staff_user_id,
         u.full_name    AS staff_name,
         u.email        AS staff_email,
         a.assignment_date,
         a.status,
         a.notes
       FROM assignments a
       JOIN users u ON u.id = a.staff_user_id
       WHERE a.booking_id = ?
         AND a.status = 'Active'`,
      [booking_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Staff assigned successfully.',
      data: assignments,
    });
  } catch (err) {
    console.error('[assignmentController.assignStaff]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while assigning staff.',
      data: null,
    });
  }
};

/**
 * PATCH /assignments/reassign
 * Admin only – reassign a specific role (Designer | Site Engineer) on a booking.
 */
const reassignStaff = async (req, res) => {
  try {
    const { booking_id, staff_role, new_staff_user_id, notes } = req.body;
    const adminUserId = req.user.id;

    if (!booking_id || !staff_role || !new_staff_user_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id, staff_role, and new_staff_user_id are required.',
        data: null,
      });
    }

    const allowedRoles = ['Designer', 'Site Engineer'];
    if (!allowedRoles.includes(staff_role)) {
      return res.status(400).json({
        success: false,
        message: `staff_role must be one of: ${allowedRoles.join(', ')}.`,
        data: null,
      });
    }

    // Validate booking
    const [bookingRows] = await query(
      `SELECT id, booking_ref FROM bookings WHERE id = ? LIMIT 1`,
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

    // Validate new staff user role
    const expectedRoleId = staff_role === 'Designer' ? 3 : 4;
    const [newStaffRows] = await query(
      `SELECT id, role_id, full_name, email FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
      [new_staff_user_id]
    );
    if (!newStaffRows || newStaffRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'New staff user not found or inactive.',
        data: null,
      });
    }
    const newStaff = newStaffRows[0];
    if (newStaff.role_id !== expectedRoleId) {
      return res.status(400).json({
        success: false,
        message: `new_staff_user_id does not have the required role (${staff_role}).`,
        data: null,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    let newAssignmentId;

    await withTransaction(async (conn) => {
      // Mark existing active assignment as Reassigned
      await conn.execute(
        `UPDATE assignments
         SET status = 'Reassigned'
         WHERE booking_id = ?
           AND staff_role = ?
           AND status     = 'Active'`,
        [booking_id, staff_role]
      );

      // Insert new assignment
      const [insertResult] = await conn.execute(
        `INSERT INTO assignments
           (booking_id, staff_role, staff_user_id, assigned_by_user_id, assignment_date, status, notes)
         VALUES (?, ?, ?, ?, ?, 'Active', ?)`,
        [booking_id, staff_role, new_staff_user_id, adminUserId, today, notes || null]
      );
      newAssignmentId = insertResult.insertId;

      // Activity log
      await conn.execute(
        `INSERT INTO activity_logs
           (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, 'REASSIGN_STAFF', 'booking', ?, ?, ?, ?)`,
        [
          adminUserId,
          booking_id,
          JSON.stringify({
            booking_ref: booking.booking_ref,
            staff_role,
            new_staff_user_id,
          }),
          req.ip || null,
          req.headers['user-agent'] || null,
        ]
      );
    });

    // Send email notification (best effort)
    try {
      if (newStaff.email) {
        await emailService.sendAssignmentNotification({
          to: newStaff.email,
          name: newStaff.full_name,
          role: staff_role,
          bookingRef: booking.booking_ref,
          bookingId: booking_id,
          isReassignment: true,
        });
      }
    } catch (emailErr) {
      console.warn('[reassignStaff] Email notification failed:', emailErr.message);
    }

    const [newAssignmentRows] = await query(
      `SELECT
         a.id,
         a.booking_id,
         a.staff_role,
         a.staff_user_id,
         u.full_name AS staff_name,
         u.email     AS staff_email,
         a.assignment_date,
         a.status,
         a.notes
       FROM assignments a
       JOIN users u ON u.id = a.staff_user_id
       WHERE a.id = ?`,
      [newAssignmentId]
    );
    const newAssignment = newAssignmentRows[0];

    return res.status(200).json({
      success: true,
      message: 'Staff reassigned successfully.',
      data: newAssignment,
    });
  } catch (err) {
    console.error('[assignmentController.reassignStaff]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while reassigning staff.',
      data: null,
    });
  }
};

/**
 * GET /assignments/booking/:bookingId
 * Admin or assigned staff – returns all assignments for a booking.
 */
const getAssignmentsByBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const currentUser = req.user;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
        data: null,
      });
    }

    // Verify booking exists
    const [bookingRows] = await query(
      `SELECT id, booking_ref FROM bookings WHERE id = ? LIMIT 1`,
      [bookingId]
    );
    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
        data: null,
      });
    }
    const booking = bookingRows[0];

    // Non-admin users may only view if they are assigned to this booking
    if (currentUser.role_id !== 1) {
      const [myAssignmentRows] = await query(
        `SELECT id FROM assignments
         WHERE booking_id = ? AND staff_user_id = ? AND status = 'Active'
         LIMIT 1`,
        [bookingId, currentUser.id]
      );
      if (!myAssignmentRows || myAssignmentRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this booking.',
          data: null,
        });
      }
    }

    const assignments = await query(
      `SELECT
         a.id,
         a.booking_id,
         a.staff_role,
         a.staff_user_id,
         u.full_name          AS staff_name,
         u.email              AS staff_email,
         u.mobile_number      AS staff_mobile,
         r.name               AS staff_role_name,
         a.assigned_by_user_id,
         ab.full_name         AS assigned_by_name,
         a.assignment_date,
         a.status,
         a.notes
       FROM assignments a
       JOIN users  u  ON u.id  = a.staff_user_id
       JOIN roles  r  ON r.id  = u.role_id
       JOIN users  ab ON ab.id = a.assigned_by_user_id
       WHERE a.booking_id = ?
       ORDER BY a.assignment_date DESC, a.id DESC`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      message: 'Assignments fetched successfully.',
      data: assignments,
    });
  } catch (err) {
    console.error('[assignmentController.getAssignmentsByBooking]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assignments.',
      data: null,
    });
  }
};

/**
 * GET /assignments/my
 * Designer / Site Engineer only – paginated list of their own assignments.
 */
const getMyAssignments = async (req, res) => {
  try {
    const staffUserId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset   = (pageNum - 1) * limitNum;

    // Build optional status filter for assignments
    const validStatuses = ['Active', 'Reassigned', 'Completed'];
    const statusFilter  = status && validStatuses.includes(status) ? status : null;

    const params = [staffUserId];
    let whereClause = `WHERE a.staff_user_id = ?`;
    if (statusFilter) {
      whereClause += ` AND a.status = ?`;
      params.push(statusFilter);
    }

    // Total count
    const [countRows] = await query(
      `SELECT COUNT(*) AS total
       FROM assignments a
       ${whereClause}`,
      params
    );
    const total = countRows && countRows.length > 0 ? countRows[0].total : 0;

    // Data rows
    const dataParams = [...params, limitNum, offset];
    const rows = await query(
      `SELECT
         a.id                      AS assignment_id,
         a.booking_id,
         a.staff_role,
         a.assignment_date,
         a.status                  AS assignment_status,
         a.notes                   AS assignment_notes,
         b.booking_ref,
         b.property_type,
         b.address                 AS site_address,
         b.city                    AS site_city,
         b.status                  AS booking_status,
         b.priority,
         b.preferred_visit_date,
         b.num_rooms,
         b.estimated_budget,
         pt.name                   AS project_type,
         c_user.full_name          AS client_name,
         c_user.mobile_number      AS client_mobile,
         s.slot_date,
         s.start_time              AS slot_start,
         s.end_time                AS slot_end
       FROM assignments a
       JOIN bookings     b      ON b.id      = a.booking_id
       JOIN project_types pt   ON pt.id     = b.project_type_id
       JOIN clients       c    ON c.id      = b.client_id
       JOIN users         c_user ON c_user.id = c.user_id
       LEFT JOIN slots    s    ON s.id      = b.slot_id
       ${whereClause}
       ORDER BY a.assignment_date DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    return res.status(200).json({
      success: true,
      message: 'Assignments fetched successfully.',
      data: {
        assignments: rows,
        pagination: {
          total,
          page:       pageNum,
          limit:      limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    console.error('[assignmentController.getMyAssignments]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching your assignments.',
      data: null,
    });
  }
};

module.exports = {
  assignStaff,
  reassignStaff,
  getAssignmentsByBooking,
  getMyAssignments,
};
