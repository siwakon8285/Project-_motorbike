const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all parts
router.get('/', auth, async (req, res) => {
  try {
    const { category, lowStock, model } = req.query;
    let query = 'SELECT * FROM parts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (model) {
      query += ` AND (compatible_models ILIKE $${paramIndex} OR compatible_models ILIKE 'All')`;
      params.push(`%${model}%`);
      paramIndex++;
    }

    if (lowStock === 'true') {
      query += ` AND quantity <= min_stock`;
    }

    query += ' ORDER BY name';

    const parts = await pool.query(query, params);
    res.json(parts.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get single part
router.get('/:id', auth, async (req, res) => {
  try {
    const part = await pool.query('SELECT * FROM parts WHERE id = $1', [req.params.id]);
    
    if (part.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }
    
    res.json(part.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create part (admin/mechanic only)
router.post('/', auth, [
  body('name').notEmpty().withMessage('Part name is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Valid quantity is required'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Valid selling price is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      name, 
      category, 
      description, 
      sku, 
      quantity, 
      minStock, 
      costPrice, 
      sellingPrice, 
      supplier 
    } = req.body;

    const newPart = await pool.query(
      `INSERT INTO parts (name, category, description, sku, quantity, min_stock, cost_price, selling_price, supplier) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, category, description, sku, quantity, minStock || 10, costPrice, sellingPrice, supplier]
    );

    res.json(newPart.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update part
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      name, 
      category, 
      description, 
      sku, 
      quantity, 
      minStock, 
      costPrice, 
      sellingPrice, 
      supplier 
    } = req.body;

    const updateResult = await pool.query(
      `UPDATE parts SET 
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        description = COALESCE($3, description),
        sku = COALESCE($4, sku),
        quantity = COALESCE($5, quantity),
        min_stock = COALESCE($6, min_stock),
        cost_price = COALESCE($7, cost_price),
        selling_price = COALESCE($8, selling_price),
        supplier = COALESCE($9, supplier),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [name, category, description, sku, quantity, minStock, costPrice, sellingPrice, supplier, req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update stock quantity
router.patch('/:id/stock', auth, [
  body('quantity').isInt().withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { quantity } = req.body;

    const updateResult = await pool.query(
      'UPDATE parts SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [quantity, req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete part (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const deleteResult = await pool.query(
      'DELETE FROM parts WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get low stock parts
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parts = await pool.query(
      'SELECT * FROM parts WHERE quantity <= min_stock ORDER BY quantity ASC'
    );

    res.json(parts.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
