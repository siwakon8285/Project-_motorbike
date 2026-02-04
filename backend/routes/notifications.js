const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notifications for user
router.get('/', auth, async (req, res) => {
  try {
    const { isRead } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (isRead !== undefined) {
      query += ` AND is_read = $${paramIndex}`;
      params.push(isRead === 'true');
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const notifications = await pool.query(query, params);
    res.json(notifications.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread count (alias for frontend)
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const updateResult = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark all as read
router.put('/read/all', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleteResult = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
