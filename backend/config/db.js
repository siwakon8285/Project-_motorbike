const { Pool } = require('pg');
const { SQLitePool } = require('./db_sqlite_adapter');
require('dotenv').config();

let pool;

// Check if we should use SQLite (e.g. if DATABASE_URL is not set or explicitly requested)
const useSqlite = process.env.USE_SQLITE === 'true' || !process.env.DATABASE_URL;

if (useSqlite) {
  console.log('Using SQLite database');
  pool = new SQLitePool({
    connectionString: './database.sqlite'
  });
} else {
  console.log('Using PostgreSQL database');
  // PostgreSQL Connection
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/motorbike_service',
  });
}

// Add event listeners only if it's a real PG pool
if (!useSqlite) {
  pool.on('connect', () => {
    // Connected to PostgreSQL
  });

  pool.on('error', (err) => {
    // PostgreSQL connection error
  });
}

module.exports = { pool };
