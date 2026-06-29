'use strict';

const { query } = require('../config/db');

// ─────────────────────────────────────────────
// Helper: safe integer from COUNT(*) results
// ─────────────────────────────────────────────
const toInt = (val) => parseInt(val, 10) || 0;
const toFloat = (val) => parseFloat(val) || 0;

// ─────────────────────────────────────────────
// GET /dashboard/admin
// ─────────────────────────────────────────────
const getAdminMetrics = async (req, res) => {
  try {
    // 1. Base counts from view
    const [metricsRows] = await query('SELECT * FROM v_dashboard_metrics LIMIT 1');
    const baseMetrics = metricsRows && metricsRows.length > 0 ? metricsRows[0] : {};

    // 2. Bookings by status (pie chart)
    const [byStatus] = await query(
      'SELECT status, COUNT(*) AS count FROM bookings GROUP BY status ORDER BY count DESC'
    );

    // 3. Bookings by priority
    const [byPriority] = await query(
      'SELECT priority, COUNT(*) AS count FROM bookings GROUP BY priority ORDER BY FIELD(priority,"Urgent","High","Medium","Low")'
    );

    // 4. Bookings this month
    const [thisMonthRows] = await query(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
    );
    const bookingsThisMonth = toInt(thisMonthRows && thisMonthRows.length > 0 ? thisMonthRows[0].count : 0);

    // 5. Bookings last month for comparison
    const [lastMonthRows] = await query(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND YEAR(created_at)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`
    );
    const bookingsLastMonth = toInt(lastMonthRows && lastMonthRows.length > 0 ? lastMonthRows[0].count : 0);

    // 6. Month-over-month growth percentage
    const momGrowth =
      bookingsLastMonth === 0
        ? null
        : (((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100).toFixed(2);

    // 7. Top 5 cities by booking count
    const [topCities] = await query(
      `SELECT city, COUNT(*) AS count FROM bookings
       WHERE city IS NOT NULL AND city != ''
       GROUP BY city ORDER BY count DESC LIMIT 5`
    );

    // 8. Revenue pipeline: SUM(estimated_budget) by status
    const [revenuePipeline] = await query(
      `SELECT status, SUM(estimated_budget) AS total_budget, COUNT(*) AS count
       FROM bookings
       WHERE estimated_budget IS NOT NULL
       GROUP BY status ORDER BY total_budget DESC`
    );

    // 9. Total estimated pipeline value
    const [totalPipelineRows] = await query(
      'SELECT SUM(estimated_budget) AS total FROM bookings WHERE estimated_budget IS NOT NULL'
    );
    const totalPipelineValue = toFloat(totalPipelineRows && totalPipelineRows.length > 0 ? totalPipelineRows[0].total : 0);

    // 10. Active slots today
    const [activeSlotsRows] = await query(
      `SELECT COUNT(*) AS count FROM slots
       WHERE slot_date = CURDATE() AND is_active = 1`
    );
    const activeSlotsToday = toInt(activeSlotsRows && activeSlotsRows.length > 0 ? activeSlotsRows[0].count : 0);

    return res.status(200).json({
      success: true,
      message: 'Admin metrics fetched successfully',
      data: {
        base_metrics: baseMetrics,
        bookings_by_status: Array.isArray(byStatus) ? byStatus : [byStatus].filter(Boolean),
        bookings_by_priority: Array.isArray(byPriority) ? byPriority : [byPriority].filter(Boolean),
        bookings_this_month: bookingsThisMonth,
        bookings_last_month: bookingsLastMonth,
        mom_growth_percent: momGrowth !== null ? parseFloat(momGrowth) : null,
        top_cities: Array.isArray(topCities) ? topCities : [topCities].filter(Boolean),
        revenue_pipeline: Array.isArray(revenuePipeline) ? revenuePipeline : [revenuePipeline].filter(Boolean),
        total_pipeline_value: totalPipelineValue,
        active_slots_today: activeSlotsToday,
      },
    });
  } catch (err) {
    console.error('[getAdminMetrics]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin metrics',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/conversion
// ─────────────────────────────────────────────
const getConversionFunnel = async (req, res) => {
  try {
    // Total leads
    const [totalRows] = await query('SELECT COUNT(*) AS count FROM bookings');
    const totalLeads = toInt(totalRows && totalRows.length > 0 ? totalRows[0].count : 0);

    // Confirmed
    const [confirmedRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Confirmed'"
    );
    const totalConfirmed = toInt(confirmedRows && confirmedRows.length > 0 ? confirmedRows[0].count : 0);

    // Completed
    const [completedRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Completed'"
    );
    const totalCompleted = toInt(completedRows && completedRows.length > 0 ? completedRows[0].count : 0);

    // Cancelled
    const [cancelledRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Cancelled'"
    );
    const totalCancelled = toInt(cancelledRows && cancelledRows.length > 0 ? cancelledRows[0].count : 0);

    // Conversion rate
    const conversionRate =
      totalLeads === 0 ? 0 : ((totalCompleted / totalLeads) * 100).toFixed(2);

    // Avg budget
    const [avgBudgetRows] = await query(
      'SELECT AVG(estimated_budget) AS avg_budget FROM bookings WHERE estimated_budget IS NOT NULL'
    );
    const avgBudget = toFloat(avgBudgetRows && avgBudgetRows.length > 0 ? avgBudgetRows[0].avg_budget : 0);

    // Bookings this week (Mon–Sun)
    const [thisWeekRows] = await query(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`
    );
    const bookingsThisWeek = toInt(thisWeekRows && thisWeekRows.length > 0 ? thisWeekRows[0].count : 0);

    // Bookings last week
    const [lastWeekRows] = await query(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)`
    );
    const bookingsLastWeek = toInt(lastWeekRows && lastWeekRows.length > 0 ? lastWeekRows[0].count : 0);

    // Funnel stages
    const [assignedRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Assigned'"
    );
    const [scheduledRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Scheduled'"
    );
    const [inProgressRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE status = 'In Progress'"
    );

    return res.status(200).json({
      success: true,
      message: 'Conversion funnel data fetched successfully',
      data: {
        total_leads: totalLeads,
        total_confirmed: totalConfirmed,
        total_assigned: toInt(assignedRows && assignedRows.length > 0 ? assignedRows[0].count : 0),
        total_scheduled: toInt(scheduledRows && scheduledRows.length > 0 ? scheduledRows[0].count : 0),
        total_in_progress: toInt(inProgressRows && inProgressRows.length > 0 ? inProgressRows[0].count : 0),
        total_completed: totalCompleted,
        total_cancelled: totalCancelled,
        conversion_rate: parseFloat(conversionRate),
        avg_budget: parseFloat(avgBudget.toFixed(2)),
        bookings_this_week: bookingsThisWeek,
        bookings_last_week: bookingsLastWeek,
        week_over_week_change: bookingsThisWeek - bookingsLastWeek,
      },
    });
  } catch (err) {
    console.error('[getConversionFunnel]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion funnel',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/designer
// ─────────────────────────────────────────────
const getDesignerMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total assigned
    const [totalRows] = await query(
      "SELECT COUNT(*) AS count FROM assignments WHERE staff_user_id = ? AND staff_role = 'Designer'",
      [userId]
    );
    const totalAssigned = toInt(totalRows && totalRows.length > 0 ? totalRows[0].count : 0);

    // Pending visits (Active assignments where booking status not Completed/Cancelled)
    const [pendingRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Designer'
         AND a.status = 'Active'
         AND b.status NOT IN ('Completed','Cancelled')`,
      [userId]
    );
    const pendingVisits = toInt(pendingRows && pendingRows.length > 0 ? pendingRows[0].count : 0);

    // Completed visits
    const [completedRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Designer'
         AND b.status = 'Completed'`,
      [userId]
    );
    const completedVisits = toInt(completedRows && completedRows.length > 0 ? completedRows[0].count : 0);

    // This month visits
    const [thisMonthRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Designer'
         AND MONTH(a.assignment_date) = MONTH(CURDATE())
         AND YEAR(a.assignment_date) = YEAR(CURDATE())`,
      [userId]
    );
    const thisMonthVisits = toInt(thisMonthRows && thisMonthRows.length > 0 ? thisMonthRows[0].count : 0);

    // Recent 5 assignments with booking details
    const [recentAssignments] = await query(
      `SELECT a.id AS assignment_id, a.assignment_date, a.status AS assignment_status, a.notes,
              b.booking_ref, b.status AS booking_status, b.priority,
              b.address, b.city, b.preferred_visit_date,
              pt.name AS project_type,
              u.full_name AS client_name
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       JOIN clients c ON b.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Designer'
       ORDER BY a.assignment_date DESC
       LIMIT 5`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Designer metrics fetched successfully',
      data: {
        total_assigned: totalAssigned,
        pending_visits: pendingVisits,
        completed_visits: completedVisits,
        this_month_visits: thisMonthVisits,
        recent_assignments: recentAssignments,
      },
    });
  } catch (err) {
    console.error('[getDesignerMetrics]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch designer metrics',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/engineer
// ─────────────────────────────────────────────
const getEngineerMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total assigned
    const [totalRows] = await query(
      "SELECT COUNT(*) AS count FROM assignments WHERE staff_user_id = ? AND staff_role = 'Site Engineer'",
      [userId]
    );
    const totalAssigned = toInt(totalRows && totalRows.length > 0 ? totalRows[0].count : 0);

    // Pending visits
    const [pendingRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Site Engineer'
         AND a.status = 'Active'
         AND b.status NOT IN ('Completed','Cancelled')`,
      [userId]
    );
    const pendingVisits = toInt(pendingRows && pendingRows.length > 0 ? pendingRows[0].count : 0);

    // Completed visits
    const [completedRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Site Engineer'
         AND b.status = 'Completed'`,
      [userId]
    );
    const completedVisits = toInt(completedRows && completedRows.length > 0 ? completedRows[0].count : 0);

    // This month visits
    const [thisMonthRows] = await query(
      `SELECT COUNT(*) AS count
       FROM assignments a
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Site Engineer'
         AND MONTH(a.assignment_date) = MONTH(CURDATE())
         AND YEAR(a.assignment_date) = YEAR(CURDATE())`,
      [userId]
    );
    const thisMonthVisits = toInt(thisMonthRows && thisMonthRows.length > 0 ? thisMonthRows[0].count : 0);

    // Recent 5 assignments with booking details
    const [recentAssignments] = await query(
      `SELECT a.id AS assignment_id, a.assignment_date, a.status AS assignment_status, a.notes,
              b.booking_ref, b.status AS booking_status, b.priority,
              b.address, b.city, b.preferred_visit_date,
              pt.name AS project_type,
              u.full_name AS client_name
       FROM assignments a
       JOIN bookings b ON a.booking_id = b.id
       JOIN clients c ON b.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       WHERE a.staff_user_id = ?
         AND a.staff_role = 'Site Engineer'
       ORDER BY a.assignment_date DESC
       LIMIT 5`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Site engineer metrics fetched successfully',
      data: {
        total_assigned: totalAssigned,
        pending_visits: pendingVisits,
        completed_visits: completedVisits,
        this_month_visits: thisMonthVisits,
        recent_assignments: recentAssignments,
      },
    });
  } catch (err) {
    console.error('[getEngineerMetrics]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch engineer metrics',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/client
// ─────────────────────────────────────────────
const getClientMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get client record
    const [clientRow] = await query(
      'SELECT id FROM clients WHERE user_id = ?',
      [userId]
    );

    if (!clientRow || clientRow.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client profile not found',
        data: null,
      });
    }
    const clientId = clientRow[0].id;

    // Total bookings
    const [totalRows] = await query(
      'SELECT COUNT(*) AS count FROM bookings WHERE client_id = ?',
      [clientId]
    );
    const totalBookings = toInt(totalRows && totalRows.length > 0 ? totalRows[0].count : 0);

    // Pending
    const [pendingRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status = 'Pending'",
      [clientId]
    );

    // Confirmed
    const [confirmedRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status = 'Confirmed'",
      [clientId]
    );

    // Completed
    const [completedRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status = 'Completed'",
      [clientId]
    );

    // Cancelled
    const [cancelledRows] = await query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status = 'Cancelled'",
      [clientId]
    );

    // Recent 3 bookings
    const [recentBookings] = await query(
      `SELECT b.id, b.booking_ref, b.status, b.priority,
              b.preferred_visit_date, b.property_type, b.city,
              b.estimated_budget, b.created_at,
              pt.name AS project_type,
              s.start_time AS slot_start, s.end_time AS slot_end
       FROM bookings b
       LEFT JOIN project_types pt ON b.project_type_id = pt.id
       LEFT JOIN slots s ON b.slot_id = s.id
       WHERE b.client_id = ?
       ORDER BY b.created_at DESC
       LIMIT 3`,
      [clientId]
    );

    return res.status(200).json({
      success: true,
      message: 'Client metrics fetched successfully',
      data: {
        total_bookings: totalBookings,
        pending: toInt(pendingRows && pendingRows.length > 0 ? pendingRows[0].count : 0),
        confirmed: toInt(confirmedRows && confirmedRows.length > 0 ? confirmedRows[0].count : 0),
        completed: toInt(completedRows && completedRows.length > 0 ? completedRows[0].count : 0),
        cancelled: toInt(cancelledRows && cancelledRows.length > 0 ? cancelledRows[0].count : 0),
        recent_bookings: recentBookings,
      },
    });
  } catch (err) {
    console.error('[getClientMetrics]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch client metrics',
      data: null,
    });
  }
};

// ─────────────────────────────────────────────
// GET /dashboard/activity
// ─────────────────────────────────────────────
const getRecentActivity = async (req, res) => {
  try {
    const [logs] = await query(
      `SELECT al.action, al.entity_type, al.entity_id, al.details,
              al.ip_address, al.created_at,
              u.full_name AS user_name, u.email AS user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 20`
    );

    // Parse details JSON if stored as string
    const parsed = logs.map((log) => {
      let details = log.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (_) { /* keep as string */ }
      }
      return { ...log, details };
    });

    return res.status(200).json({
      success: true,
      message: 'Recent activity fetched successfully',
      data: parsed,
    });
  } catch (err) {
    console.error('[getRecentActivity]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      data: null,
    });
  }
};

module.exports = {
  getAdminMetrics,
  getDesignerMetrics,
  getEngineerMetrics,
  getClientMetrics,
  getConversionFunnel,
  getRecentActivity,
};
