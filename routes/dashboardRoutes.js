const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// GET /api/dashboard/stats - Admin Summary Overview Metrics
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const [[vehiclesCount]] = await db.query('SELECT COUNT(*) as count FROM vehicles');
    const [[availableCount]] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'");
    const [[rentedCount]] = await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'rented'");
    const [[customersCount]] = await db.query('SELECT COUNT(*) as count FROM customers');
    const [[rentalsCount]] = await db.query('SELECT COUNT(*) as count FROM rentals');
    const [[pendingCount]] = await db.query("SELECT COUNT(*) as count FROM rentals WHERE status = 'pending'");
    const [[revenueRes]] = await db.query("SELECT SUM(amount) as revenue FROM payments WHERE payment_status = 'paid'");
    const [[unreadMsgCount]] = await db.query("SELECT COUNT(*) as count FROM contact_messages WHERE status = 'unread'");
    const [[totalMsgCount]] = await db.query('SELECT COUNT(*) as count FROM contact_messages');

    const totalRevenue = revenueRes && revenueRes.revenue ? parseFloat(revenueRes.revenue).toFixed(2) : '0.00';

    res.json({
      success: true,
      stats: {
        totalVehicles: vehiclesCount ? vehiclesCount.count : 0,
        availableVehicles: availableCount ? availableCount.count : 0,
        rentedVehicles: rentedCount ? rentedCount.count : 0,
        totalCustomers: customersCount ? customersCount.count : 0,
        totalBookings: rentalsCount ? rentalsCount.count : 0,
        pendingBookings: pendingCount ? pendingCount.count : 0,
        totalRevenue: totalRevenue,
        unreadMessages: unreadMsgCount ? unreadMsgCount.count : 0,
        totalMessages: totalMsgCount ? totalMsgCount.count : 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard statistics.' });
  }
});

module.exports = router;
