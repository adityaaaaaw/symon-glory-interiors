/**
 * Glory Simon Interiors - Site Visit Booking System
 * MySQL Connection Pool
 *
 * Uses mysql2's built-in connection pooling for optimal performance.
 * All database access throughout the application uses this module.
 */

const mysql = require('mysql2/promise');

// ─── Build pool configuration from environment variables ─────────────────────
const poolConfig = {
  host              : process.env.DB_HOST            || 'localhost',
  port              : parseInt(process.env.DB_PORT   || '3306', 10),
  user              : process.env.DB_USER            || 'root',
  password          : process.env.DB_PASSWORD        || '',
  database          : process.env.DB_NAME            || 'glory_simon_booking',
  connectionLimit   : parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit        : parseInt(process.env.DB_QUEUE_LIMIT      || '0',  10),
  waitForConnections: true,
  charset           : 'utf8mb4',
  timezone          : '+05:30',
  // Keep connections alive
  enableKeepAlive   : true,
  keepAliveInitialDelay: 30000,
  // Automatically reconnect on errors
  multipleStatements: false,
};

// ─── Create the shared pool ───────────────────────────────────────────────────
const pool = mysql.createPool(poolConfig);

/**
 * Test the database connection on startup.
 * Logs success or throws a fatal error if unable to connect.
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    const [[row]] = await conn.execute('SELECT 1 AS connected, DATABASE() AS db_name');
    console.log(`✅ MySQL connected — database: "${row.db_name}"`);
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Execute a query using the pool.
 * Automatically releases the connection back to the pool.
 *
 * @param {string}  sql    - SQL query string with ? placeholders
 * @param {Array}   params - Bound parameter values
 * @returns {Promise<Array>} [rows, fields]
 */
async function query(sql, params = []) {
  const [rows, fields] = await pool.execute(sql, params);
  return [rows, fields];
}

/**
 * Execute multiple queries within a single transaction.
 * Automatically commits or rolls back.
 *
 * @param {Function} callback - async function(conn) that performs queries
 * @returns {Promise<any>} Result of callback
 */
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction, testConnection };
