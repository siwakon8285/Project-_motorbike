const { pool } = require('./backend/config/db');

async function clearBookings() {
  try {
    console.log('Starting to clear history...');

    // Delete booking services first (foreign key dependency)
    console.log('Deleting booking services...');
    await pool.query('DELETE FROM booking_services');

    // Delete notifications related to bookings
    console.log('Deleting notifications...');
    await pool.query("DELETE FROM notifications WHERE type = 'booking'");

    // Delete bookings
    console.log('Deleting bookings...');
    await pool.query('DELETE FROM bookings');
    
    console.log('Successfully cleared all booking history.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing bookings:', err);
    process.exit(1);
  }
}

clearBookings();
