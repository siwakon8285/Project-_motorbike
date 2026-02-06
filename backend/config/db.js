const { Pool } = require('pg');
require('dotenv').config();

console.log('Using PostgreSQL database');
// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/motorbike_service',
});

pool.on('connect', () => {
  // Connected to PostgreSQL
});

pool.on('error', (err) => {
  // PostgreSQL connection error
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = { pool };
