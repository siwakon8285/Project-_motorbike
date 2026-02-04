const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      // Customer dashboard
      const [bookingsResult, upcomingResult, historyResult, completedResult, spentResult] = await Promise.all([
        pool.query(
          'SELECT COUNT(*) as total FROM bookings WHERE user_id = $1',
          [req.user.id]
        ),
        pool.query(
          `SELECT COUNT(*) as upcoming FROM bookings 
           WHERE user_id = $1 AND booking_date >= CURRENT_DATE AND status NOT IN ('cancelled', 'completed')`,
          [req.user.id]
        ),
        pool.query(
          `SELECT b.*, json_agg(s.name) as services
           FROM bookings b
           LEFT JOIN booking_services bs ON b.id = bs.booking_id
           LEFT JOIN services s ON bs.service_id = s.id
           WHERE b.user_id = $1
           GROUP BY b.id
           ORDER BY b.booking_date DESC
           LIMIT 5`,
          [req.user.id]
        ),
        pool.query(
          "SELECT COUNT(*) as completed FROM bookings WHERE user_id = $1 AND status = 'completed'",
          [req.user.id]
        ),
        pool.query(
          "SELECT COALESCE(SUM(total_price), 0) as total_spent FROM bookings WHERE user_id = $1 AND status = 'completed'",
          [req.user.id]
        )
      ]);

      const responseData = {
        stats: {
          totalBookings: parseInt(bookingsResult.rows[0]?.total || 0),
          upcomingServices: parseInt(upcomingResult.rows[0]?.upcoming || 0),
          completedServices: parseInt(completedResult.rows[0]?.completed || 0),
          totalSpent: parseFloat(spentResult.rows[0]?.total_spent || 0)
        },
        recentHistory: historyResult.rows
      };
      
      res.json(responseData);
    } else {
      // Admin/Mechanic dashboard
      const today = new Date().toISOString().split('T')[0];
      
      const [
        totalBookingsResult,
        todayBookingsResult,
        pendingBookingsResult,
        totalCustomersResult,
        revenueResult,
        lowStockResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM bookings'),
        pool.query(
          'SELECT COUNT(*) as today FROM bookings WHERE booking_date = $1',
          [today]
        ),
        pool.query(
          `SELECT COUNT(*) as pending FROM bookings WHERE status IN ('pending', 'confirmed')`
        ),
        pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['customer']),
        pool.query(
          `SELECT COALESCE(SUM(total_price), 0) as revenue 
           FROM bookings 
           WHERE status = 'completed' AND booking_date >= DATE_TRUNC('month', CURRENT_DATE)`
        ),
        pool.query('SELECT COUNT(*) as count FROM parts WHERE quantity <= min_stock')
      ]);

      // Recent bookings
      const recentBookings = await pool.query(
        `SELECT b.*, u.username, u.first_name, u.last_name,
                json_agg(s.name) as services
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         LEFT JOIN booking_services bs ON b.id = bs.booking_id
         LEFT JOIN services s ON bs.service_id = s.id
         GROUP BY b.id, u.username, u.first_name, u.last_name
         ORDER BY b.created_at DESC
         LIMIT 10`
      );

      res.json({
        stats: {
          totalBookings: parseInt(totalBookingsResult.rows[0]?.total || 0),
          todayBookings: parseInt(todayBookingsResult.rows[0]?.today || 0),
          pendingBookings: parseInt(pendingBookingsResult.rows[0]?.pending || 0),
          totalCustomers: parseInt(totalCustomersResult.rows[0]?.total || 0),
          monthlyRevenue: parseFloat(revenueResult.rows[0]?.revenue || 0),
          lowStockItems: parseInt(lowStockResult.rows[0]?.count || 0)
        },
        recentBookings: recentBookings.rows
      });
    }
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get customer-specific stats (alias for frontend)
router.get('/customer-stats', auth, async (req, res) => {
  try {
    const [bookingsResult, upcomingResult, historyResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM bookings WHERE user_id = $1',
        [req.user.id]
      ),
      pool.query(
        `SELECT COUNT(*) as upcoming FROM bookings 
         WHERE user_id = $1 AND booking_date >= CURRENT_DATE AND status NOT IN ('cancelled', 'completed')`,
        [req.user.id]
      ),
      pool.query(
        `SELECT b.*, json_agg(s.name) as services
         FROM bookings b
         LEFT JOIN booking_services bs ON b.id = bs.booking_id
         LEFT JOIN services s ON bs.service_id = s.id
         WHERE b.user_id = $1 AND b.status = 'completed'
         GROUP BY b.id
         ORDER BY b.booking_date DESC
         LIMIT 5`,
        [req.user.id]
      )
    ]);

    res.json({
      stats: {
        totalBookings: parseInt(bookingsResult.rows[0]?.total || 0),
        upcomingServices: parseInt(upcomingResult.rows[0]?.upcoming || 0)
      },
      recentHistory: historyResult.rows
    });
  } catch (err) {
    // console.error('Dashboard Customer Stats Error:', err);
    res.status(500).send('Server error: ' + err.message);
  }
});

// Get revenue chart data
router.get('/revenue', auth, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { period = 'month' } = req.query;
    let query;

    if (period === 'week') {
      query = `
        SELECT DATE_TRUNC('week', booking_date) as period, SUM(total_price) as revenue
        FROM bookings
        WHERE status = 'completed' AND booking_date >= CURRENT_DATE - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', booking_date)
        ORDER BY period
      `;
    } else {
      query = `
        SELECT DATE_TRUNC('month', booking_date) as period, SUM(total_price) as revenue
        FROM bookings
        WHERE status = 'completed' AND booking_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', booking_date)
        ORDER BY period
      `;
    }

    const revenueData = await pool.query(query);
    res.json(revenueData.rows);
  } catch (err) {
    // console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
