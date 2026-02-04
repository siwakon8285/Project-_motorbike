const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { role, search } = req.query;
    let query = 'SELECT id, username, email, role, first_name, last_name, phone, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const users = await pool.query(query, params);
    res.json(users.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, role, first_name, last_name, phone, address, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = userResult.rows[0];
    
    const vehiclesResult = await pool.query(
      'SELECT * FROM vehicles WHERE user_id = $1',
      [user.id]
    );

    res.json({
      ...user,
      vehicles: vehiclesResult.rows
    });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update user profile
router.put('/:id', auth, [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('phone').optional(),
  body('address').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { firstName, lastName, phone, address } = req.body;
    
    const updateResult = await pool.query(
      `UPDATE users SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING id, username, email, role, first_name, last_name, phone, address`,
      [firstName, lastName, phone, address, req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add vehicle to user profile
router.post('/:id/vehicles', auth, [
  body('brand').notEmpty().withMessage('Vehicle brand is required'),
  body('model').notEmpty().withMessage('Vehicle model is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('licensePlate').notEmpty().withMessage('License plate is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { brand, model, year, licensePlate, color } = req.body;

    const vehicleResult = await pool.query(
      `INSERT INTO vehicles (user_id, brand, model, year, license_plate, color) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, brand, model, year, licensePlate, color]
    );

    res.json(vehicleResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update user role (admin only)
router.put('/:id/role', auth, [
  body('role').isIn(['customer', 'admin', 'mechanic'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { role } = req.body;

    const updateResult = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, role',
      [role, req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
