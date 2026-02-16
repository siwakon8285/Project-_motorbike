const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure Multer for slip upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'slip-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Helper to merge services and parts
const mergeServicesAndParts = (rows) => {
  return rows.map(row => {
    const services = row.services_data || [];
    const parts = row.parts_data || [];
    
    // Extract custom service from notes
    const customServiceMatch = row.notes ? row.notes.match(/บริการที่ต้องการ: (.*?)(?:\n|$)/) : null;
    const customService = customServiceMatch ? customServiceMatch[1] : null;

    let allServices = [...services, ...parts];

    if (customService) {
        // Use a negative ID to indicate it's not a DB record
        allServices.unshift({ id: -1, name: customService, price: 0 });
    }

    // Combine them, parts act as services here
    return {
      ...row,
      services: allServices,
      services_data: undefined, // cleanup
      parts_data: undefined // cleanup
    };
  });
};

// Get all bookings
router.get('/', auth, async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT b.*, u.username, u.email, u.first_name, u.last_name, u.phone,
             v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate as vehicle_license_plate,
             v.color as vehicle_color, v.year as vehicle_year,
             (
               SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'price', s.price))
               FROM booking_services bs 
               JOIN services s ON bs.service_id = s.id
               WHERE bs.booking_id = b.id
             ) as services_data,
             (
               SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'price', p.selling_price))
               FROM booking_parts bp 
               JOIN parts p ON bp.part_id = p.id
               WHERE bp.booking_id = b.id
             ) as parts_data
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
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

    query += ` ORDER BY b.booking_date DESC, b.booking_time DESC`;

    const bookings = await pool.query(query, params);
    res.json(mergeServicesAndParts(bookings.rows));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get my bookings (customer only)
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const query = `
      SELECT b.*, u.username, u.email, u.first_name, u.last_name, u.phone,
             v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate as vehicle_license_plate,
             v.color as vehicle_color, v.year as vehicle_year,
             (
               SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'price', s.price))
               FROM booking_services bs 
               JOIN services s ON bs.service_id = s.id
               WHERE bs.booking_id = b.id
             ) as services_data,
             (
               SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'price', p.selling_price))
               FROM booking_parts bp 
               JOIN parts p ON bp.part_id = p.id
               WHERE bp.booking_id = b.id
             ) as parts_data
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;
    
    const bookings = await pool.query(query, [req.user.id]);
    res.json(mergeServicesAndParts(bookings.rows));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const bookingQuery = `
      SELECT b.*, u.username, u.email, u.first_name, u.last_name, u.phone,
             (
               SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration))
               FROM booking_services bs 
               JOIN services s ON bs.service_id = s.id
               WHERE bs.booking_id = b.id
             ) as services_data,
             (
               SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'price', p.selling_price))
               FROM booking_parts bp 
               JOIN parts p ON bp.part_id = p.id
               WHERE bp.booking_id = b.id
             ) as parts_data
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `;
    
    const booking = await pool.query(bookingQuery, [req.params.id]);

    if (booking.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.user.role === 'customer' && booking.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(mergeServicesAndParts(booking.rows)[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create booking
router.post('/', auth, upload.single('slipImage'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Handle multipart/form-data parsing for arrays/objects
    let { bookingDate, bookingTime, serviceIds, partIds, vehicleId, vehicle, notes, paymentMethod } = req.body;
    
    // Default payment method
    if (!paymentMethod) paymentMethod = 'shop';

    // Parse JSON strings if coming from FormData
    try {
      if (typeof serviceIds === 'string') serviceIds = JSON.parse(serviceIds || '[]');
      if (typeof partIds === 'string') partIds = JSON.parse(partIds || '[]');
      if (typeof vehicle === 'string') vehicle = JSON.parse(vehicle || 'null');
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ message: 'Invalid JSON data' });
    }

    if (!bookingDate || !bookingTime) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ message: 'Booking date and time are required' });
    }

    // Check if slot is already taken
    const existingBooking = await client.query(
      'SELECT id FROM bookings WHERE booking_date = $1 AND booking_time::text LIKE $2 || \'%\' AND status != $3',
      [bookingDate, bookingTime, 'cancelled']
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ message: 'This time slot is already booked. Please choose another time.' });
    }

    // Validate stock availability
    if (partIds.length > 0) {
      for (const partId of partIds) {
        const partRes = await client.query('SELECT name, quantity FROM parts WHERE id = $1 FOR UPDATE', [partId]);
        if (partRes.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({ message: `Part ID ${partId} not found` });
        }
        if (partRes.rows[0].quantity < 1) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({ message: `สินค้า ${partRes.rows[0].name} หมดแล้ว (Out of Stock)` });
        }
      }
    }

    let finalVehicleId = vehicleId;

    if (!finalVehicleId && vehicle) {
      // Create new vehicle
      const newVehicle = await client.query(
        'INSERT INTO vehicles (user_id, brand, model, year, license_plate, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [req.user.id, vehicle.brand, vehicle.model, vehicle.year, vehicle.licensePlate, vehicle.color]
      );
      finalVehicleId = newVehicle.rows[0].id;
    }

    // Calculate total price for services
    let servicesTotal = 0;
    if (serviceIds.length > 0) {
      const servicesResult = await client.query(
        'SELECT SUM(price) as total FROM services WHERE id = ANY($1::int[])',
        [serviceIds]
      );
      servicesTotal = parseFloat(servicesResult.rows[0]?.total || 0);
    }

    // Calculate total price for parts
    let partsTotal = 0;
    if (partIds.length > 0) {
      const partsResult = await client.query(
        'SELECT SUM(selling_price) as total FROM parts WHERE id = ANY($1::int[])',
        [partIds]
      );
      partsTotal = parseFloat(partsResult.rows[0]?.total || 0);
    }

    const totalPrice = servicesTotal + partsTotal;

    // Determine status based on payment
    let bookingStatus = 'pending';
    let paymentStatus = 'pending';
    let slipImagePath = null;

    if (paymentMethod === 'promptpay') {
      if (req.file) {
        // User requested to wait for admin confirmation even with slip
        bookingStatus = 'pending';
        paymentStatus = 'paid';
        slipImagePath = 'uploads/' + req.file.filename;
      }
    } else if (paymentMethod === 'shop') {
      bookingStatus = 'pending';
      paymentStatus = 'pending';
    }

    // Create booking
    const newBooking = await client.query(
      `INSERT INTO bookings (user_id, vehicle_id, booking_date, booking_time, total_price, notes, payment_method, payment_status, slip_image, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, finalVehicleId || null, bookingDate, bookingTime, totalPrice, notes, paymentMethod, paymentStatus, slipImagePath, bookingStatus]
    );

    const bookingId = newBooking.rows[0].id;

    // Add booking services
    if (serviceIds.length > 0) {
      for (const serviceId of serviceIds) {
        await client.query(
          'INSERT INTO booking_services (booking_id, service_id) VALUES ($1, $2)',
          [bookingId, serviceId]
        );
      }
    }

    // Add booking parts and deduct stock
    if (partIds.length > 0) {
      for (const partId of partIds) {
        await client.query(
          'INSERT INTO booking_parts (booking_id, part_id) VALUES ($1, $2)',
          [bookingId, partId]
        );
        // Deduct stock
        await client.query(
          'UPDATE parts SET quantity = quantity - 1 WHERE id = $1',
          [partId]
        );
      }
    }

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_booking_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'การจองสำเร็จ',
        `การจองของคุณสำหรับวันที่ ${bookingDate} เวลา ${bookingTime} ถูกสร้างเรียบร้อยแล้ว สถานะ: รอดำเนินการ`,
        'booking',
        bookingId
      ]
    );

    await client.query('COMMIT');
    client.release();

    // Emit real-time update
    if (partIds.length > 0 && req.io) {
      req.io.emit('parts_update');
    }

    // Trigger n8n webhook for all new bookings (Pending or Confirmed)
    // REMOVED as per user request: only send on Admin confirmation
    /*
    if (process.env.N8N_SHEETS_WEBHOOK_URL) {
       // ... code removed ...
    }
    */

    res.json(newBooking.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error(err.message);
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
      confirmed: 'การจองของคุณได้รับการยืนยันแล้ว',
      in_progress: 'รถของคุณกำลังอยู่ระหว่างการซ่อม',
      completed: 'การซ่อมเสร็จสิ้นแล้ว! คุณสามารถมารับรถได้เลย',
      cancelled: 'การจองของคุณถูกยกเลิก'
    };

    if (statusMessages[status]) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_booking_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking.user_id,
          'อัปเดตสถานะการจอง',
          statusMessages[status],
          'booking',
          booking.id
        ]
      );
    }

    // Trigger n8n webhook if status is confirmed
    if (status === 'confirmed') {
      if (process.env.N8N_SHEETS_WEBHOOK_URL) {
        try {
          console.log(`[n8n] Triggering webhook for booking ${req.params.id} (Status: ${status})`);
          const fullBookingQuery = `
          SELECT b.id, b.status, b.notes, b.total_price, b.payment_method, b.payment_status, b.slip_image,
                 TO_CHAR(b.booking_date, 'YYYY-MM-DD') as booking_date,
                 TO_CHAR(b.booking_time, 'HH24:MI') as booking_time,
                 u.username, u.email, u.first_name, u.last_name, u.phone,
                 v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate as vehicle_license_plate,
                 (
                   SELECT json_agg(json_build_object('name', s.name, 'price', s.price))
                   FROM booking_services bs 
                   JOIN services s ON bs.service_id = s.id
                   WHERE bs.booking_id = b.id
                 ) as services_data,
                 (
                   SELECT json_agg(json_build_object('name', p.name, 'price', p.selling_price))
                   FROM booking_parts bp 
                   JOIN parts p ON bp.part_id = p.id
                   WHERE bp.booking_id = b.id
                 ) as parts_data
          FROM bookings b
          JOIN users u ON b.user_id = u.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.id = $1
        `;
          
          const fullBooking = await pool.query(fullBookingQuery, [req.params.id]);
          
          if (fullBooking.rows.length > 0) {
             const bookingData = fullBooking.rows[0];
             
             // Extract custom service from notes
             const customServiceMatch = bookingData.notes ? bookingData.notes.match(/บริการที่ต้องการ: (.*?)(?:\n|$)/) : null;
             const customService = customServiceMatch ? customServiceMatch[1] : null;

             // Merge services and parts for n8n
             const servicesList = [
               ...(bookingData.services_data || []),
               ...(bookingData.parts_data || [])
             ];

             if (customService) {
                // Add custom service to the list (with 0 price as it's just a request)
                servicesList.unshift({ name: customService, price: 0 });
             }
             
             bookingData.services = servicesList;

             delete bookingData.services_data;
             delete bookingData.parts_data;

             // Read slip image and convert to Base64 for n8n
             // IMPORTANT: Even if no slip (e.g. Pay at Shop), we send a placeholder file.
             // This is to prevent n8n "Upload file" node from failing due to missing binary data.
             if (bookingData.slip_image) {
               try {
                 const imagePath = path.join(__dirname, '..', bookingData.slip_image);
                 if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    bookingData.slip_image_base64 = imageBuffer.toString('base64');
                    bookingData.slip_filename = path.basename(bookingData.slip_image);
                  } else {
                    // File record exists but file missing - send placeholder
                    const placeholderText = "Slip image file not found on server.";
                    bookingData.slip_image_base64 = Buffer.from(placeholderText).toString('base64');
                    bookingData.slip_filename = 'error_slip_missing.txt';
                  }
                } catch (imgErr) {
                 console.error('[n8n] Error reading slip image:', imgErr);
                 // Send placeholder on error
                 const placeholderText = "Error reading slip image.";
                 bookingData.slip_image_base64 = Buffer.from(placeholderText).toString('base64');
                 bookingData.slip_filename = 'error_reading_slip.txt';
               }
             } else {
                 // No slip (Pay at Shop) - send placeholder text file
                 // This ensures n8n workflow continues to Google Sheets node
                 const placeholderText = "No slip image provided (Payment at Shop)";
                 bookingData.slip_image_base64 = Buffer.from(placeholderText).toString('base64');
                 bookingData.slip_filename = 'no_slip_shop_payment.txt';
             }

             // Send data to n8n (fire and forget, but await to ensure it's sent)
             await axios.post(process.env.N8N_SHEETS_WEBHOOK_URL, bookingData, {
               maxContentLength: Infinity,
               maxBodyLength: Infinity,
               headers: process.env.N8N_SECRET ? { 'X-N8N-SECRET': process.env.N8N_SECRET } : undefined
             });
             console.log(`[n8n] Sent booking ${req.params.id} to n8n webhook successfully`);
          } else {
              console.warn(`[n8n] Booking ${req.params.id} not found when trying to send webhook`);
          }
        } catch (webhookErr) {
          console.error('[n8n] Failed to send to n8n webhook:', webhookErr.message);
        }
      } else {
        console.warn('⚠️  Skipping n8n webhook: N8N_SHEETS_WEBHOOK_URL is missing in .env');
      }
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err.message);
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
      'SELECT booking_time FROM bookings WHERE booking_date = $1 AND status != $2',
      [date, 'cancelled']
    );

    const bookedTimes = bookedResult.rows.map(row => row.booking_time.substring(0, 5));
    const availableSlots = timeSlots.filter(time => !bookedTimes.includes(time));

    res.json({ availableSlots, bookedTimes });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete all bookings for a user (admin only) and reset booking ID sequence
router.delete('/user/:userId', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'admin') {
      client.release();
      return res.status(403).json({ message: 'Admin access required' });
    }
    await client.query('BEGIN');
    const userId = parseInt(req.params.userId);
    const deleteNotifications = await client.query(
      "DELETE FROM notifications WHERE user_id = $1 AND type = 'booking' RETURNING id",
      [userId]
    );
    const deleteBookings = await client.query(
      'DELETE FROM bookings WHERE user_id = $1 RETURNING id',
      [userId]
    );
    const maxIdRes = await client.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM bookings');
    const maxId = parseInt(maxIdRes.rows[0].max_id || 0);
    await client.query(
      "SELECT setval(pg_get_serial_sequence('bookings','id'), $1, true)",
      [Math.max(maxId, 1)]
    );
    await client.query('COMMIT');
    client.release();
    return res.json({
      deletedBookings: deleteBookings.rowCount,
      deletedNotifications: deleteNotifications.rowCount,
      nextBookingId: maxId + 1
    });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
