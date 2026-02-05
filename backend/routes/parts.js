const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure Multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'part-' + Date.now() + path.extname(file.originalname));
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
    // console.error(err.message);
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
router.post('/', auth, upload.single('image'), [
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
      supplier,
      compatibleModels
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newPart = await pool.query(
      `INSERT INTO parts (name, category, description, sku, quantity, min_stock, cost_price, selling_price, supplier, compatible_models, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, category, description, sku, quantity, minStock || 10, costPrice, sellingPrice, supplier, compatibleModels, imageUrl]
    );

    // Emit socket event
    req.io.emit('parts_update', { type: 'create', data: newPart.rows[0] });

    res.json(newPart.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update part
router.put('/:id', auth, upload.single('image'), async (req, res) => {
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
      supplier,
      compatibleModels
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Build update query dynamically based on provided fields
    let updateQuery = 'UPDATE parts SET ';
    const params = [];
    let paramIndex = 1;

    if (name) { updateQuery += `name = $${paramIndex}, `; params.push(name); paramIndex++; }
    if (category) { updateQuery += `category = $${paramIndex}, `; params.push(category); paramIndex++; }
    if (description) { updateQuery += `description = $${paramIndex}, `; params.push(description); paramIndex++; }
    if (sku) { updateQuery += `sku = $${paramIndex}, `; params.push(sku); paramIndex++; }
    if (quantity) { updateQuery += `quantity = $${paramIndex}, `; params.push(quantity); paramIndex++; }
    if (minStock) { updateQuery += `min_stock = $${paramIndex}, `; params.push(minStock); paramIndex++; }
    if (costPrice) { updateQuery += `cost_price = $${paramIndex}, `; params.push(costPrice); paramIndex++; }
    if (sellingPrice) { updateQuery += `selling_price = $${paramIndex}, `; params.push(sellingPrice); paramIndex++; }
    if (supplier) { updateQuery += `supplier = $${paramIndex}, `; params.push(supplier); paramIndex++; }
    if (compatibleModels) { updateQuery += `compatible_models = $${paramIndex}, `; params.push(compatibleModels); paramIndex++; }
    if (imageUrl) { updateQuery += `image_url = $${paramIndex}, `; params.push(imageUrl); paramIndex++; }

    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(req.params.id);

    const updatedPart = await pool.query(updateQuery, params);

    if (updatedPart.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Emit socket event
    req.io.emit('parts_update', { type: 'update', data: updatedPart.rows[0] });

    res.json(updatedPart.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete part
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deleteResult = await pool.query('DELETE FROM parts WHERE id = $1 RETURNING *', [req.params.id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Emit socket event
    req.io.emit('parts_update', { type: 'delete', id: parseInt(req.params.id) });

    res.json({ message: 'Part deleted' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
