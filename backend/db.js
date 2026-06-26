const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Ensure database credentials are loaded from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true // Required for running multi-statement database.sql migrations
};

// Check if credentials are provided
const missingVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`CRITICAL ERROR: Missing database environment variables: ${missingVars.join(', ')}`);
  console.error('Please configure these in your .env file. SQLite fallback has been removed.');
  process.exit(1);
}

let mysqlPool = null;

// Core query wrappers mapped to MySQL connection pool
const query = {
  async run(sql, params = []) {
    try {
      const [result] = await mysqlPool.execute(sql, params);
      return { id: result.insertId, changes: result.affectedRows };
    } catch (err) {
      console.error(`MySQL query.run error: [SQL: ${sql}]`, err);
      throw err;
    }
  },

  async get(sql, params = []) {
    try {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows[0] || null;
    } catch (err) {
      console.error(`MySQL query.get error: [SQL: ${sql}]`, err);
      throw err;
    }
  },

  async all(sql, params = []) {
    try {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows;
    } catch (err) {
      console.error(`MySQL query.all error: [SQL: ${sql}]`, err);
      throw err;
    }
  },

  async exec(sql) {
    try {
      await mysqlPool.query(sql);
    } catch (err) {
      console.error('MySQL query.exec error:', err);
      throw err;
    }
  },

  // Helper to execute transactional queries
  async transaction(callback) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      
      // We pass a custom query runner tied to this connection
      const transactionQuery = {
        async run(sql, params = []) {
          const [result] = await connection.execute(sql, params);
          return { id: result.insertId, changes: result.affectedRows };
        },
        async get(sql, params = []) {
          const [rows] = await connection.execute(sql, params);
          return rows[0] || null;
        },
        async all(sql, params = []) {
          const [rows] = await connection.execute(sql, params);
          return rows;
        },
        async exec(sql) {
          await connection.query(sql);
        }
      };

      const result = await callback(transactionQuery);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      console.error('Transaction rollback due to error:', err);
      throw err;
    } finally {
      connection.release();
    }
  }
};

// Initialize database schema from database.sql
async function initDb() {
  try {
    console.log(`[Database] Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
    
    // Attempt database creation first (using temporary connection)
    try {
      const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port
      });
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await tempConnection.end();
      console.log(`[Database] Database '${dbConfig.database}' verified/created.`);
    } catch (err) {
      console.warn(`[Database Warning] Could not run CREATE DATABASE command. Proceeding assuming database exists. Details: ${err.message}`);
    }

    // Establish connection pool
    mysqlPool = mysql.createPool(dbConfig);
    
    // Test the pool connection
    const conn = await mysqlPool.getConnection();
    console.log('[Database] MySQL connection pool established successfully.');
    conn.release();

    // Read and run migrations from database.sql
    const migrationPath = path.resolve(__dirname, 'database', 'database.sql');
    if (fs.existsSync(migrationPath)) {
      console.log('[Database] Executing database.sql schema migrations...');
      const schemaSql = fs.readFileSync(migrationPath, 'utf8');
      await query.exec(schemaSql);
      console.log('[Database] Schema creation/validation complete.');
    } else {
      console.error(`CRITICAL WARNING: database.sql not found at ${migrationPath}`);
    }
  } catch (error) {
    console.error('[Database] Failed to initialize MySQL database:', error);
    throw error;
  }
}

module.exports = {
  query,
  initDb,
  getPool: () => mysqlPool,
  getEngine: () => 'mysql'
};
