const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/motorbike_service';

const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

console.log(
  isLocal
    ? 'Using local PostgreSQL database'
    : 'Using remote PostgreSQL database (e.g. Supabase)'
);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('connect', () => {});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = { pool };
