const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all bookings
router.get('/', auth, async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT b.*, u.username, u.email, u.first_name, u.last_name,
             v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate as vehicle_license_plate,
             v.color as vehicle_color, v.year as vehicle_year,
             json_agg(json_build_object(
               'id', s.id, 'name', s.name, 'price', s.price
             )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (req.user.role === 'customer') {
      query += ` AND b.user_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    }

    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (date) {
      query += ` AND b.booking_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ` GROUP BY b.id, u.username, u.email, u.first_name, u.last_name, v.brand, v.model, v.license_plate, v.color, v.year ORDER BY b.booking_date DESC, b.booking_time DESC`;

    const bookings = await pool.query(query, params);
    res.json(bookings.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get my bookings (customer only)
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const query = `
      SELECT b.*, 
             v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate as vehicle_license_plate,
             v.color as vehicle_color, v.year as vehicle_year,
             json_agg(json_build_object('id', s.id, 'name', s.name, 'price', s.price)) FILTER (WHERE s.id IS NOT NULL) as services
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE b.user_id = $1
      GROUP BY b.id, v.brand, v.model, v.license_plate, v.color, v.year
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;
    
    const bookings = await pool.query(query, [req.user.id]);
    res.json(bookings.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const bookingQuery = `
      SELECT b.*, u.username, u.email, u.first_name, u.last_name, u.phone,
             json_agg(json_build_object(
               'id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration
             )) FILTER (WHERE s.id IS NOT NULL) as services
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE b.id = $1
      GROUP BY b.id, u.username, u.email, u.first_name, u.last_name, u.phone
    `;
    
    const booking = await pool.query(bookingQuery, [req.params.id]);

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.user.role === 'customer' && booking.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create booking
router.post('/', auth, [
  body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
  body('bookingTime').notEmpty().withMessage('Booking time is required'),
  body('serviceIds').isArray().withMessage('Service IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingDate, bookingTime, serviceIds, vehicleId, vehicle, notes } = req.body;

    let finalVehicleId = vehicleId;

    if (!finalVehicleId && vehicle) {
      // Create new vehicle
      const newVehicle = await pool.query(
        'INSERT INTO vehicles (user_id, brand, model, year, license_plate, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [req.user.id, vehicle.brand, vehicle.model, vehicle.year, vehicle.licensePlate, vehicle.color]
      );
      finalVehicleId = newVehicle.rows[0].id;
    }

    // Calculate total price
    const servicesResult = await pool.query(
      'SELECT SUM(price) as total FROM services WHERE id = ANY($1::int[])',
      [serviceIds]
    );
    const totalPrice = servicesResult.rows[0]?.total || 0;

    // Create booking
    const newBooking = await pool.query(
      `INSERT INTO bookings (user_id, vehicle_id, booking_date, booking_time, total_price, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, finalVehicleId || null, bookingDate, bookingTime, totalPrice, notes]
    );

    const bookingId = newBooking.rows[0].id;

    // Add booking services
    for (const serviceId of serviceIds) {
      await pool.query(
        'INSERT INTO booking_services (booking_id, service_id) VALUES ($1, $2)',
        [bookingId, serviceId]
      );
    }

    // Create notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_booking_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'Booking Confirmed',
        `Your booking for ${bookingDate} at ${bookingTime} has been confirmed.`,
        'booking',
        bookingId
      ]
    );

    res.json(newBooking.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update booking status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [req.params.id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateResult = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    // Create notification for status change
    const statusMessages = {
      confirmed: 'Your booking has been confirmed.',
      in_progress: 'Your service is now in progress.',
      completed: 'Your service has been completed!',
      cancelled: 'Your booking has been cancelled.'
    };

    if (statusMessages[status]) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_booking_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking.user_id,
          'Booking Update',
          statusMessages[status],
          'booking',
          booking.id
        ]
      );
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get available time slots
router.get('/slots/available', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Define business hours (9 AM to 6 PM)
    const timeSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Get booked slots
    const bookedResult = await pool.query(
      'SELECT booking_time FROM bookings WHERE booking_date = $1 AND status NOT IN ($2, $3)',
      [date, 'cancelled', 'completed']
    );

    const bookedTimes = bookedResult.rows.map(row => row.booking_time.substring(0, 5));
    const availableSlots = timeSlots.filter(time => !bookedTimes.includes(time));

    res.json({ availableSlots, bookedTimes });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
