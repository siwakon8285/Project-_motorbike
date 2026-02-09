const { pool } = require('./config/db');

async function migrate() {
  try {
    console.log('Starting migration...');
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slip_image VARCHAR(255);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 0;
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    pool.end();
  }
}

migrate();