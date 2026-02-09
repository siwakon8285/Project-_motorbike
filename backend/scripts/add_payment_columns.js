const { pool } = require('../config/db');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add payment_method column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_method') THEN
          ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50);
          RAISE NOTICE 'Added payment_method column';
        END IF;
      END
      $$;
    `);

    // Add payment_status column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_status') THEN
          ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
          RAISE NOTICE 'Added payment_status column';
        END IF;
      END
      $$;
    `);

    // Add slip_image column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='slip_image') THEN
          ALTER TABLE bookings ADD COLUMN slip_image VARCHAR(255);
          RAISE NOTICE 'Added slip_image column';
        END IF;
      END
      $$;
    `);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
