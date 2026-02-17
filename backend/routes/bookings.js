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
    const cancelRequestMatch = row.notes ? row.notes.match(/คำขอยกเลิกโดยลูกค้า:\s*(.*?)(?:\n|$)/) : null;
    const cancelRequestNote = cancelRequestMatch ? cancelRequestMatch[1] : null;

    let allServices = [...services, ...parts];

    if (customService) {
        // Use a negative ID to indicate it's not a DB record
        allServices.unshift({ id: -1, name: customService, price: 0 });
    }

    // Combine them, parts act as services here
    return {
      ...row,
      services: allServices,
      cancel_request_note: cancelRequestNote || undefined,
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

// Update booking details
router.put('/:id', auth, async (req, res) => {
  try {
    const { bookingDate, bookingTime, notes, totalPrice } = req.body;
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = result.rows[0];
    if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (typeof totalPrice !== 'undefined' && !['admin', 'mechanic'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or mechanic can edit price' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    const normalizeDate = (d) => {
      try {
        if (!d) return null;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        return new Date(d).toISOString().slice(0,10);
      } catch {
        return null;
      }
    };
    if (bookingDate) {
      const nd = normalizeDate(bookingDate);
      if (!nd) return res.status(400).json({ message: 'Invalid booking date' });
      fields.push(`booking_date = $${idx++}`); values.push(nd);
    }
    if (bookingTime) {
      fields.push(`booking_time = $${idx++}`); values.push(bookingTime);
    }
    if (typeof notes !== 'undefined') {
      fields.push(`notes = $${idx++}`); values.push(notes);
    }
    if (typeof totalPrice !== 'undefined') {
      const n = Number(totalPrice);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'Invalid total price' });
      }
      fields.push(`total_price = $${idx++}`); values.push(n);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    if (bookingDate || bookingTime) {
      const checkDate = normalizeDate(bookingDate || booking.booking_date);
      const checkTime = (bookingTime || booking.booking_time).toString().substring(0,5);
      const conflict = await pool.query(
        "SELECT id FROM bookings WHERE booking_date = $1 AND booking_time::time = $2::time AND status != $3 AND id != $4",
        [checkDate, `${checkTime}:00`, 'cancelled', id]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({ message: 'This time slot is already booked' });
      }
    }
    const update = await pool.query(
      `UPDATE bookings SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    try {
      const prevNotes = booking.notes || '';
      const newNotes = typeof notes !== 'undefined' ? notes : prevNotes;
      const hadCancelReq = /คำขอยกเลิกโดยลูกค้า:\s*/.test(prevNotes);
      const hasCancelReqNow = /คำขอยกเลิกโดยลูกค้า:\s*/.test(newNotes);
      if (!hadCancelReq && hasCancelReqNow) {
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const admins = adminsRes.rows.map(r => r.id);
        for (const adminId of admins) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_booking_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              adminId,
              'คำขอยกเลิกจากลูกค้า',
              `ลูกค้าขอยกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time}`,
              'booking',
              booking.id
            ]
          );
        }
      }
    } catch (notifyErr) {
      console.warn('[notify] admin cancel request notification (notes) failed:', notifyErr.message);
    }
    res.json(update.rows[0]);
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
    let { status } = req.body;
    const synonyms = {
      'cancel': 'cancelled',
      'cancel-requested': 'cancel_requested',
      'request_cancel': 'cancel_requested',
      'in-progress': 'in_progress'
    };
    if (typeof status === 'string') {
      const lower = status.toLowerCase();
      status = synonyms[lower] || lower;
    }
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'cancel_requested'];

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

    // Only admin/mechanic can set final cancellation,
    // except customers can cancel immediately when current status is 'pending'
    if (req.user.role === 'customer' && status === 'cancelled') {
      if (booking.status !== 'pending') {
        return res.status(403).json({ message: 'Require admin confirmation to cancel' });
      }
    }

    // Customers can request cancellation only if not already completed/cancelled
    if (status === 'cancel_requested') {
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Cannot request cancellation for completed/cancelled booking' });
      }
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
      cancelled: 'การจองของคุณถูกยกเลิก',
      cancel_requested: 'ส่งคำขอยกเลิกเรียบร้อยแล้ว รอแอดมินยืนยัน'
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
    if (status === 'cancel_requested') {
      try {
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const admins = adminsRes.rows.map(r => r.id);
        for (const adminId of admins) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_booking_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              adminId,
              'คำขอยกเลิกจากลูกค้า',
              `ลูกค้าขอยกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time}`,
              'booking',
              booking.id
            ]
          );
        }
      } catch (notifyErr) {
        console.warn('[notify] admin cancel request notification failed:', notifyErr.message);
      }
    }

    if (status === 'completed' && req.io) {
      try {
        req.io.emit('booking_completed', {
          bookingId: booking.id,
          userId: booking.user_id,
          totalPrice: booking.total_price
        });
      } catch (emitErr) {
        console.warn('[socket] emit booking_completed failed:', emitErr.message);
      }
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

// Delete a single booking by ID (admin only)
router.delete('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'admin') {
      client.release();
      return res.status(403).json({ message: 'Admin access required' });
    }
    const bookingId = parseInt(req.params.id);
    const exists = await client.query('SELECT id FROM bookings WHERE id = $1', [bookingId]);
    if (exists.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Booking not found' });
    }
    await client.query('BEGIN');
    await client.query('DELETE FROM booking_services WHERE booking_id = $1', [bookingId]);
    await client.query('DELETE FROM booking_parts WHERE booking_id = $1', [bookingId]);
    await client.query('DELETE FROM notifications WHERE related_booking_id = $1 AND type = $2', [bookingId, 'booking']);
    await client.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await client.query('COMMIT');
    client.release();
    return res.json({ message: 'Booking deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ message: 'Server error' });
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
    const remainingRes = await client.query('SELECT COUNT(*)::int AS cnt FROM bookings');
    const remaining = remainingRes.rows[0].cnt || 0;
    if (remaining === 0) {
      await client.query("SELECT setval(pg_get_serial_sequence('bookings','id'), 1, false)");
    } else {
      const maxIdRes = await client.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM bookings');
      const maxId = parseInt(maxIdRes.rows[0].max_id || 0);
      await client.query(
        "SELECT setval(pg_get_serial_sequence('bookings','id'), $1, true)",
        [Math.max(maxId, 1)]
      );
    }
    await client.query('COMMIT');
    client.release();
    return res.json({
      deletedBookings: deleteBookings.rowCount,
      deletedNotifications: deleteNotifications.rowCount,
      nextBookingId: remaining === 0 ? 1 : undefined
    });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete all bookings by user email (admin only) and reset sequence appropriately
router.delete('/user/by-email', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'admin') {
      client.release();
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { email } = req.query;
    if (!email) {
      client.release();
      return res.status(400).json({ message: 'Email is required' });
    }
    const userRes = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    const userId = userRes.rows[0].id;
    await client.query('BEGIN');
    const deleteNotifications = await client.query(
      "DELETE FROM notifications WHERE user_id = $1 AND type = 'booking' RETURNING id",
      [userId]
    );
    const deleteBookings = await client.query(
      'DELETE FROM bookings WHERE user_id = $1 RETURNING id',
      [userId]
    );
    const remainingRes = await client.query('SELECT COUNT(*)::int AS cnt FROM bookings');
    const remaining = remainingRes.rows[0].cnt || 0;
    if (remaining === 0) {
      await client.query("SELECT setval(pg_get_serial_sequence('bookings','id'), 1, false)");
    } else {
      const maxIdRes = await client.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM bookings');
      const maxId = parseInt(maxIdRes.rows[0].max_id || 0);
      await client.query(
        "SELECT setval(pg_get_serial_sequence('bookings','id'), $1, true)",
        [Math.max(maxId, 1)]
      );
    }
    await client.query('COMMIT');
    client.release();
    return res.json({
      email,
      deletedBookings: deleteBookings.rowCount,
      deletedNotifications: deleteNotifications.rowCount,
      sequenceResetTo: remaining === 0 ? 1 : 'MAX(id)+1'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ message: 'Server error' });
  }
});

// Customer-friendly cancel endpoint
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];
    if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel completed/cancelled booking' });
    }
    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason.trim() : '';
    let newNotes = booking.notes || '';
    if (reason) {
      const line = `คำขอยกเลิกโดยลูกค้า: ${reason}`;
      newNotes = newNotes ? `${newNotes}\n${line}` : line;
    }
    let nextStatus = 'cancel_requested';
    if (req.user.role === 'customer' && booking.status === 'pending') {
      nextStatus = 'cancelled';
    } else if (['admin', 'mechanic'].includes(req.user.role)) {
      nextStatus = 'cancelled';
    }
    let update;
    try {
      if (reason) {
        update = await pool.query(
          'UPDATE bookings SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
          [nextStatus, newNotes, req.params.id]
        );
      } else {
        update = await pool.query(
          'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [nextStatus, req.params.id]
        );
      }
    } catch (e) {
      // Fallback for databases that haven't added 'cancel_requested' to CHECK constraint (23514)
      if (e && e.code === '23514' && nextStatus === 'cancel_requested') {
        if (reason) {
          await pool.query(
            'UPDATE bookings SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newNotes, req.params.id]
          );
        }
        const current = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        update = { rows: [current.rows[0]] };
      } else {
        throw e;
      }
    }
    const messageMap = {
      cancelled: req.user.role === 'customer' ? 'ยกเลิกเรียบร้อย' : 'ยกเลิกโดยแอดมิน',
      cancel_requested: 'ส่งคำขอยกเลิกแล้ว รอแอดมินยืนยัน'
    };
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_booking_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'อัปเดตสถานะการจอง',
        messageMap[nextStatus],
        'booking',
        booking.id
      ]
    );
    if (nextStatus === 'cancel_requested') {
      try {
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const admins = adminsRes.rows.map(r => r.id);
        for (const adminId of admins) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_booking_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              adminId,
              'คำขอยกเลิกจากลูกค้า',
              reason 
                ? `ลูกค้าขอยกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time} • เหตุผล: ${reason}`
                : `ลูกค้าขอยกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time}`,
              'booking',
              booking.id
            ]
          );
        }
        if (req.io) {
          try { req.io.emit('notifications_update'); } catch (e) {}
        }
      } catch (notifyErr) {
        console.warn('[notify] admin cancel request notification failed:', notifyErr.message);
      }
    }
    // Also notify admins when a customer cancels a pending booking directly
    if (nextStatus === 'cancelled' && req.user.role === 'customer') {
      try {
        const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        const admins = adminsRes.rows.map(r => r.id);
        for (const adminId of admins) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_booking_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              adminId,
              'ลูกค้ายกเลิกการจอง',
              reason 
                ? `ลูกค้ายกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time} • เหตุผล: ${reason}`
                : `ลูกค้ายกเลิกการจอง #${booking.id} วันที่ ${booking.booking_date} เวลา ${booking.booking_time}`,
              'booking',
              booking.id
            ]
          );
        }
        if (req.io) {
          try { req.io.emit('notifications_update'); } catch (e) {}
        }
      } catch (notifyErr2) {
        console.warn('[notify] admin pending-cancel notification failed:', notifyErr2.message);
      }
    }
    return res.json(update.rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
