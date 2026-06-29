'use strict';

const { query } = require('../config/db');

// ─────────────────────────────────────────────
// Colour mapping for frontend calendar rendering
// ─────────────────────────────────────────────
const STATUS_COLORS = {
  Pending: '#F59E0B',
  Confirmed: '#3B82F6',
  Assigned: '#8B5CF6',
  Scheduled: '#06B6D4',
  'In Progress': '#F97316',
  Completed: '#10B981',
  Cancelled: '#EF4444',
};

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────

/**
 * Returns a YYYY-MM-DD string from a Date object.
 */
const toDateStr = (d) => d.toISOString().split('T')[0];

/**
 * Returns { startDate, endDate } as YYYY-MM-DD strings based on the view type.
 * @param {'month'|'week'|'day'} view
 * @param {string} dateStr – YYYY-MM-DD
 */
const computeDateRange = (view, dateStr) => {
  const base = new Date(dateStr + 'T00:00:00');

  if (view === 'day') {
    return { startDate: toDateStr(base), endDate: toDateStr(base) };
  }

  if (view === 'week') {
    // ISO week: Monday = 1, Sunday = 0 → adjust to Mon–Sun
    const day = base.getDay(); // 0 Sun … 6 Sat
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toDateStr(monday), endDate: toDateStr(sunday) };
  }

  // month (default)
  const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { startDate: toDateStr(firstDay), endDate: toDateStr(lastDay) };
};

// ─────────────────────────────────────────────
// GET /calendar
// Query params: view (month|week|day), date (YYYY-MM-DD)
// ─────────────────────────────────────────────
const getCalendarData = async (req, res) => {
  try {
    const view = ['month', 'week', 'day'].includes(req.query.view)
      ? req.query.view
      : 'month';

    const rawDate = req.query.date;
    const dateStr =
      rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : toDateStr(new Date());

    const { startDate, endDate } = computeDateRange(view, dateStr);

    // ── 1. Bookings in range (from summary view) ──────────────────────────
    const bookingsSql = `
      SELECT
        booking_id,
        booking_ref,
        client_name,
        preferred_visit_date,
        slot_start_time,
        slot_end_time,
        status,
        priority,
        designer_name,
        engineer_name,
        project_type_name AS project_type,
        city
      FROM v_bookings_summary
      WHERE preferred_visit_date BETWEEN ? AND ?
        AND status != 'Cancelled'
      ORDER BY preferred_visit_date ASC, slot_start_time ASC`;

    const bookings = await query(bookingsSql, [startDate, endDate]);

    // Attach color mapping per booking
    const bookingsWithColor = bookings.map((b) => ({
      ...b,
      color: STATUS_COLORS[b.status] || '#6B7280',
      slot_time:
        b.slot_start_time && b.slot_end_time
          ? `${b.slot_start_time} – ${b.slot_end_time}`
          : null,
    }));

    // ── 2. Slot availability overlay ─────────────────────────────────────
    const slotsSql = `
      SELECT
        slot_date,
        start_time,
        end_time,
        max_bookings  AS total_spots,
        current_bookings,
        (max_bookings - current_bookings) AS available_spots,
        is_active
      FROM slots
      WHERE slot_date BETWEEN ? AND ?
        AND is_active = 1
      ORDER BY slot_date ASC, start_time ASC`;

    const slots = await query(slotsSql, [startDate, endDate]);

    return res.status(200).json({
      success: true,
      message: 'Calendar data fetched successfully',
      data: {
        view,
        start_date: startDate,
        end_date: endDate,
        color_mapping: STATUS_COLORS,
        bookings: bookingsWithColor,
        slots,
      },
    });
  } catch (err) {
    console.error('[getCalendarData]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar data',
      data: null,
    });
  }
};

module.exports = { getCalendarData };
