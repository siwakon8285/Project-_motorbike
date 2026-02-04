const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY name';

    const services = await pool.query(query, params);
    res.json(services.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get single service
router.get('/:id', async (req, res) => {
  try {
    const service = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    
    if (service.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create service (admin only)
router.post('/', auth, [
  body('name').notEmpty().withMessage('Service name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, description, price, duration, category } = req.body;

    const newService = await pool.query(
      'INSERT INTO services (name, description, price, duration, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, duration || 60, category]
    );

    res.json(newService.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update service (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, description, price, duration, category } = req.body;

    const updateResult = await pool.query(
      `UPDATE services SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        duration = COALESCE($4, duration),
        category = COALESCE($5, category)
       WHERE id = $6 RETURNING *`,
      [name, description, price, duration, category, req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete service (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const deleteResult = await pool.query(
      'DELETE FROM services WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
