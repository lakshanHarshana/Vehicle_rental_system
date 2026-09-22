const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validate');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_2026';

// POST /api/auth/register - Register a new customer
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, driver_license, address } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check if driver license already exists
    const [existingLicense] = await db.query('SELECT id FROM customers WHERE driver_license = ?', [driver_license.trim()]);
    if (existingLicense.length > 0) {
      return res.status(400).json({ success: false, message: 'Driver license number is already registered.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user into users table
    const [userResult] = await db.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'customer')",
      [cleanEmail, password_hash]
    );
    const userId = userResult.insertId;

    // Insert customer details into customers table
    const [customerResult] = await db.query(
      `INSERT INTO customers (user_id, first_name, last_name, phone, driver_license, address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, first_name.trim(), last_name.trim(), phone.trim(), driver_license.trim(), address ? address.trim() : '']
    );
    const customerId = customerResult.insertId;

    // Generate JWT token
    const tokenPayload = {
      userId,
      customerId,
      email: cleanEmail,
      role: 'customer',
      first_name: first_name.trim(),
      last_name: last_name.trim()
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: tokenPayload
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const [users] = await db.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    let profile = { userId: user.id, email: user.email, role: user.role };

    if (user.role === 'customer') {
      const [customers] = await db.query('SELECT * FROM customers WHERE user_id = ?', [user.id]);
      if (customers.length > 0) {
        profile.customerId = customers[0].id;
        profile.first_name = customers[0].first_name;
        profile.last_name = customers[0].last_name;
        profile.phone = customers[0].phone;
        profile.driver_license = customers[0].driver_license;
      }
    } else if (user.role === 'admin') {
      profile.first_name = 'Admin';
      profile.last_name = 'User';
    }

    const token = jwt.sign(profile, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: profile
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me - Fetch authenticated user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await db.query('SELECT id, email, role, created_at FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    let profile = { ...user };

    if (user.role === 'customer') {
      const [customers] = await db.query('SELECT * FROM customers WHERE user_id = ?', [user.id]);
      if (customers.length > 0) {
        profile.customerDetails = customers[0];
      }
    }

    res.json({ success: true, user: profile });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
});

module.exports = router;
