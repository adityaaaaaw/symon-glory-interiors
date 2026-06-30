/**
 * Glory Simon Interiors - Site Visit Booking System
 * Database Initialization Script
 *
 * Creates the database if it does not exist and runs database.sql schema.
 *
 * Usage:
 *   npm run db:init
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

async function initDatabase() {
  // Connect without specifying a database first
  const conn = await mysql.createConnection({
    host     : process.env.DB_HOST     || 'localhost',
    port     : parseInt(process.env.DB_PORT || '3306', 10),
    user     : process.env.DB_USER     || 'root',
    password : process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('\n🗄️  Glory Simon Interiors — Database Initializer\n');

    const dbName = process.env.DB_NAME || 'glory_simon_booking';

    console.log(`📦 Dropping database "${dbName}" if exists...`);
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`📦 Creating database "${dbName}"...`);
    await conn.query(
      `CREATE DATABASE \`${dbName}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ Database ready');

    await conn.query(`USE \`${dbName}\``);

    const schemaPath = path.join(__dirname, '..', 'database.sql');
    const schema     = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Running schema...');
    
    // Parse schema by DELIMITER commands to execute triggers and procedures correctly
    const parts = schema.split(/DELIMITER\s+(\$\$|;)/gi);
    let currentDelimiter = ';';
    
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part === '$$') {
        currentDelimiter = '$$';
        continue;
      }
      if (part === ';') {
        currentDelimiter = ';';
        continue;
      }
      
      if (currentDelimiter === '$$') {
        const statements = part.split('$$');
        for (let stmt of statements) {
          stmt = stmt.trim();
          if (stmt) {
            await conn.query(stmt);
          }
        }
      } else {
        await conn.query(part);
      }
    }
    
    console.log('✅ Schema applied successfully');

    console.log('\n✅ Database initialization complete!');
    console.log(`   Run "npm run seed" to populate with sample data.\n`);

  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

initDatabase();
