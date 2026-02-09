
const { pool } = require('./config/db');

async function checkServices(bookingId) {
  try {
    console.log(`Checking services for booking ID: ${bookingId}`);
    
    // Check booking_services table
    const bookingServices = await pool.query(
      'SELECT * FROM booking_services WHERE booking_id = $1',
      [bookingId]
    );
    console.log('booking_services entries:', bookingServices.rows);

    // Check full query result
    const fullBookingQuery = `
      SELECT b.id, b.notes,
             json_agg(json_build_object(
               'name', s.name, 'price', s.price
             )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE b.id = $1
      GROUP BY b.id
    `;
    const result = await pool.query(fullBookingQuery, [bookingId]);
    console.log('Query result:', JSON.stringify(result.rows[0], null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await checkServices(7);
  await checkServices(8);
  process.exit();
}

run();
