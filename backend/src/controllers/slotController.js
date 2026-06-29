// src/controllers/slotController.js
const { query, withTransaction } = require('../config/db');

// ─── Helpers ────────────────────────────────────────────────────────────────

const toDateStr = (d) => d.toISOString().slice(0, 10);

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /slots
 * Public – returns slots for a given date (defaults to today → +7 days window).
 * Reads from v_slot_availability view.
 */
const getSlots = async (req, res) => {
  try {
    const { date } = req.query;

    let rows;

    if (date) {
      // Validate basic date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD.',
          data: null,
        });
      }

      rows = await query(
        `SELECT
           id,
           slot_date,
           start_time,
           end_time,
           max_bookings,
           current_bookings,
           available_spots,
           availability_label,
           is_active
         FROM v_slot_availability
         WHERE slot_date = ?
           AND is_active = 1
         ORDER BY start_time ASC`,
        [date]
      );
    } else {
      const today = toDateStr(new Date());
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const endDate = toDateStr(futureDate);

      rows = await query(
        `SELECT
           id,
           slot_date,
           start_time,
           end_time,
           max_bookings,
           current_bookings,
           available_spots,
           availability_label,
           is_active
         FROM v_slot_availability
         WHERE slot_date BETWEEN ? AND ?
           AND is_active = 1
         ORDER BY slot_date ASC, start_time ASC`,
        [today, endDate]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Slots fetched successfully.',
      data: rows,
    });
  } catch (err) {
    console.error('[slotController.getSlots]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching slots.',
      data: null,
    });
  }
};

/**
 * POST /slots
 * Admin only – create a new slot.
 */
const createSlot = async (req, res) => {
  try {
    const { slot_date, start_time, end_time, max_bookings } = req.body;
    const createdBy = req.user.id;

    // Validate slot_date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDay = new Date(slot_date);
    slotDay.setHours(0, 0, 0, 0);

    if (slotDay <= today) {
      return res.status(400).json({
        success: false,
        message: 'Slot date must be a future date.',
        data: null,
      });
    }

    // Validate end_time > start_time
    if (end_time <= start_time) {
      return res.status(400).json({
        success: false,
        message: 'end_time must be after start_time.',
        data: null,
      });
    }

    // Validate max_bookings range
    const maxB = parseInt(max_bookings, 10);
    if (isNaN(maxB) || maxB < 1 || maxB > 10) {
      return res.status(400).json({
        success: false,
        message: 'max_bookings must be between 1 and 10.',
        data: null,
      });
    }

    // Check for duplicate (same date + start_time + end_time)
    const [existing] = await query(
      `SELECT id FROM slots
       WHERE slot_date = ?
         AND start_time = ?
         AND end_time   = ?
       LIMIT 1`,
      [slot_date, start_time, end_time]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A slot with the same date and time already exists.',
        data: null,
      });
    }

    // Insert slot
    const [result] = await query(
      `INSERT INTO slots
         (slot_date, start_time, end_time, max_bookings, current_bookings, is_active, created_by)
       VALUES (?, ?, ?, ?, 0, 1, ?)`,
      [slot_date, start_time, end_time, maxB, createdBy]
    );

    const [newSlotRows] = await query(
      `SELECT * FROM slots WHERE id = ?`,
      [result.insertId]
    );
    const newSlot = newSlotRows[0];

    return res.status(201).json({
      success: true,
      message: 'Slot created successfully.',
      slot: newSlot,
      data: newSlot,
    });
  } catch (err) {
    console.error('[slotController.createSlot]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating slot.',
      data: null,
    });
  }
};

/**
 * PUT /slots/:id
 * Admin only – update max_bookings and/or is_active.
 */
const updateSlot = async (req, res) => {
  try {
    const slotId = parseInt(req.params.id, 10);
    const { max_bookings, is_active } = req.body;

    if (isNaN(slotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid slot ID.',
        data: null,
      });
    }

    // Fetch current slot
    const [slotRows] = await query(
      `SELECT * FROM slots WHERE id = ? LIMIT 1`,
      [slotId]
    );

    if (!slotRows || slotRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found.',
        data: null,
      });
    }
    const slot = slotRows[0];

    // Determine new values – fall back to existing if not provided
    let newMaxBookings = slot.max_bookings;
    let newIsActive = slot.is_active;

    if (max_bookings !== undefined) {
      const maxB = parseInt(max_bookings, 10);
      if (isNaN(maxB) || maxB < 1 || maxB > 10) {
        return res.status(400).json({
          success: false,
          message: 'max_bookings must be between 1 and 10.',
          data: null,
        });
      }
      // Cannot reduce below current bookings
      if (maxB < slot.current_bookings) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce max_bookings below current bookings count (${slot.current_bookings}).`,
          data: null,
        });
      }
      newMaxBookings = maxB;
    }

    if (is_active !== undefined) {
      newIsActive = is_active ? 1 : 0;
    }

    await query(
      `UPDATE slots SET max_bookings = ?, is_active = ? WHERE id = ?`,
      [newMaxBookings, newIsActive, slotId]
    );

    const [updatedSlotRows] = await query(
      `SELECT * FROM slots WHERE id = ?`,
      [slotId]
    );
    const updatedSlot = updatedSlotRows[0];

    return res.status(200).json({
      success: true,
      message: 'Slot updated successfully.',
      slot: updatedSlot,
      data: updatedSlot,
    });
  } catch (err) {
    console.error('[slotController.updateSlot]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating slot.',
      data: null,
    });
  }
};

/**
 * DELETE /slots/:id
 * Admin only – soft delete (is_active = 0) if no bookings.
 */
const deleteSlot = async (req, res) => {
  try {
    const slotId = parseInt(req.params.id, 10);

    if (isNaN(slotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid slot ID.',
        data: null,
      });
    }

    const [slotRows] = await query(
      `SELECT * FROM slots WHERE id = ? LIMIT 1`,
      [slotId]
    );

    if (!slotRows || slotRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found.',
        data: null,
      });
    }
    const slot = slotRows[0];

    if (slot.current_bookings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete slot – it has ${slot.current_bookings} active booking(s).`,
        data: null,
      });
    }

    // Soft delete
    await query(
      `UPDATE slots SET is_active = 0 WHERE id = ?`,
      [slotId]
    );

    return res.status(200).json({
      success: true,
      message: 'Slot deactivated (soft-deleted) successfully.',
      data: { id: slotId },
    });
  } catch (err) {
    console.error('[slotController.deleteSlot]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting slot.',
      data: null,
    });
  }
};

/**
 * GET /slots/range
 * Admin only – returns all slots (including inactive) within a date range.
 */
const getSlotsByDateRange = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date query parameters are required.',
        data: null,
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from_date) || !/^\d{4}-\d{2}-\d{2}$/.test(to_date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
        data: null,
      });
    }

    if (from_date > to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date cannot be after to_date.',
        data: null,
      });
    }

    const rows = await query(
      `SELECT
         s.id,
         s.slot_date,
         s.start_time,
         s.end_time,
         s.max_bookings,
         s.current_bookings,
         (s.max_bookings - s.current_bookings) AS available_spots,
         s.is_active,
         s.created_by,
         u.full_name AS created_by_name
       FROM slots s
       LEFT JOIN users u ON u.id = s.created_by
       WHERE s.slot_date BETWEEN ? AND ?
       ORDER BY s.slot_date ASC, s.start_time ASC`,
      [from_date, to_date]
    );

    return res.status(200).json({
      success: true,
      message: 'Slots fetched successfully.',
      data: rows,
    });
  } catch (err) {
    console.error('[slotController.getSlotsByDateRange]', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching slots by date range.',
      data: null,
    });
  }
};

module.exports = {
  getSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getSlotsByDateRange,
};
