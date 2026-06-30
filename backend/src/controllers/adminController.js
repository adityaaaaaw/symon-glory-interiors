'use strict';

const { query } = require('../config/db');

async function getDiagnostics(req, res) {
  try {
    const [uRows] = await query('SELECT COUNT(*) AS count FROM users');
    const totalUsers = uRows[0].count;

    const [bRows] = await query('SELECT COUNT(*) AS count FROM bookings');
    const totalBookings = bRows[0].count;

    const [dRows] = await query('SELECT COUNT(*) AS count FROM users WHERE role_id = 3');
    const totalDesigners = dRows[0].count;

    const [eRows] = await query('SELECT COUNT(*) AS count FROM users WHERE role_id = 4');
    const totalEngineers = eRows[0].count;

    const tables = ['users', 'clients', 'designers', 'site_engineers', 'bookings', 'slots', 'assignments', 'visit_reports', 'notifications', 'activity_logs'];
    const tableCounts = [];
    for (const table of tables) {
      const [countRows] = await query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      tableCounts.push({ tableName: table, rowCount: countRows[0].count });
    }

    const [recentUsers] = await query(`
      SELECT 
        u.id, 
        u.full_name AS name, 
        u.email, 
        r.name AS role, 
        u.mobile_number AS phone 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.created_at DESC 
      LIMIT 10
    `);

    const [recentBookings] = await query(`
      SELECT 
        b.id, 
        b.booking_ref AS booking_id_str, 
        u.full_name AS client_name, 
        u.email, 
        u.mobile_number AS phone, 
        b.status, 
        b.created_at 
      FROM bookings b 
      JOIN clients c ON b.client_id = c.id 
      JOIN users u ON c.user_id = u.id 
      ORDER BY b.created_at DESC 
      LIMIT 10
    `);

    return res.status(200).json({
      activeDatabase: 'MYSQL',
      totalUsers,
      totalBookings,
      totalDesigners,
      totalEngineers,
      tableCounts,
      recentUsers,
      recentBookings
    });
  } catch (err) {
    console.error('[adminController.getDiagnostics]', err.message);
    return res.status(500).json({ success: false, message: 'Could not fetch diagnostics.' });
  }
}

async function getDbSummary(req, res) {
  try {
    const [uRows] = await query('SELECT COUNT(*) AS count FROM users');
    const totalUsers = uRows[0].count;

    const [bRows] = await query('SELECT COUNT(*) AS count FROM bookings');
    const totalBookings = bRows[0].count;

    const [dRows] = await query('SELECT COUNT(*) AS count FROM users WHERE role_id = 3');
    const totalDesigners = dRows[0].count;

    const [eRows] = await query('SELECT COUNT(*) AS count FROM users WHERE role_id = 4');
    const totalEngineers = eRows[0].count;

    const [aRows] = await query('SELECT COUNT(*) AS count FROM assignments');
    const totalAssignments = aRows[0].count;

    const [rRows] = await query('SELECT COUNT(*) AS count FROM visit_reports');
    const totalReports = rRows[0].count;

    const [nRows] = await query('SELECT COUNT(*) AS count FROM notifications');
    const totalNotifications = nRows[0].count;

    return res.status(200).json({
      activeDatabase: 'MYSQL',
      totalUsers,
      totalBookings,
      totalDesigners,
      totalEngineers,
      totalAssignments,
      totalReports,
      totalNotifications
    });
  } catch (err) {
    console.error('[adminController.getDbSummary]', err.message);
    return res.status(500).json({ success: false, message: 'Could not fetch database summary.' });
  }
}

async function getDbTableData(req, res) {
  const tableParam = req.params.table;
  
  // Map endpoint names to exact database table names
  const TABLE_MAP = {
    'users': 'users',
    'bookings': 'bookings',
    'designers': 'designers',
    'site-engineers': 'site_engineers',
    'assignments': 'assignments',
    'visit-reports': 'visit_reports',
    'notifications': 'notifications',
    'booking-activities': 'activity_logs'
  };

  const tableName = TABLE_MAP[tableParam];
  if (!tableName) {
    return res.status(404).json({ success: false, message: `Table "${tableParam}" not found or not accessible.` });
  }

  try {
    // Select all fields from the table, ordered by id desc (if id exists) or created_at desc
    const [rows] = await query(`SELECT * FROM \`${tableName}\` LIMIT 100`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error(`[adminController.getDbTableData] Table: ${tableName}`, err.message);
    return res.status(500).json({ success: false, message: `Could not fetch data for table ${tableName}.` });
  }
}

module.exports = {
  getDiagnostics,
  getDbSummary,
  getDbTableData
};
