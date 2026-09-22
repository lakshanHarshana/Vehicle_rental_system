const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin, isCustomer } = require('../middleware/auth');

// GET /api/customers - Admin: List all customers
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const [customers] = await db.query(
      `SELECT c.*, u.email, u.created_at AS registered_at,
              COUNT(r.id) AS total_bookings
       FROM customers c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN rentals r ON c.id = r.customer_id
       GROUP BY c.id
       ORDER BY c.id DESC`
    );
    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching customers.' });
  }
});

// GET /api/customers/profile - Customer: View Profile
router.get('/profile', verifyToken, isCustomer, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const [customers] = await db.query(
      `SELECT c.*, u.email 
       FROM customers c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer profile not found.' });
    }

    res.json({ success: true, profile: customers[0] });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
});

// PUT /api/customers/profile - Customer: Update Profile
router.put('/profile', verifyToken, isCustomer, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const { first_name, last_name, phone, address } = req.body;

    await db.query(
      'UPDATE customers SET first_name = ?, last_name = ?, phone = ?, address = ? WHERE id = ?',
      [first_name, last_name, phone, address || '', customerId]
    );

    res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// DELETE /api/customers/:id - Admin: Delete Customer
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const customerId = req.params.id;

    // Get user_id associated with customer
    const [customers] = await db.query('SELECT user_id FROM customers WHERE id = ?', [customerId]);
    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const userId = customers[0].user_id;

    // Delete user will cascade delete customer
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Customer and user account deleted successfully.' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, message: 'Server error deleting customer.' });
  }
});

module.exports = router;
