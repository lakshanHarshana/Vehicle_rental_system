const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isCustomer, isAdmin } = require('../middleware/auth');
const { validateRental } = require('../middleware/validate');

// POST /api/rentals - Customer: Book a Vehicle
router.post('/', verifyToken, isCustomer, validateRental, async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, payment_method } = req.body;
    const customerId = req.user.customerId;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer profile missing.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Get vehicle details & daily rate
    const [vehicles] = await db.query(
      `SELECT v.*, c.daily_rate 
       FROM vehicles v 
       JOIN vehicle_categories c ON v.category_id = c.id 
       WHERE v.id = ?`,
      [vehicle_id]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const vehicle = vehicles[0];
    if (vehicle.status !== 'available') {
      return res.status(400).json({ success: false, message: `Vehicle is currently ${vehicle.status}.` });
    }

    // Check for date overlap on existing active/pending rentals (Universal range overlap check)
    const [overlapping] = await db.query(
      `SELECT id FROM rentals 
       WHERE vehicle_id = ? AND status IN ('pending', 'active') 
       AND (start_date <= ? AND end_date >= ?)`,
      [vehicle_id, end_date, start_date]
    );

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is already reserved for the selected dates. Please choose different dates.'
      });
    }

    const totalCost = (totalDays * vehicle.daily_rate).toFixed(2);

    // Create rental
    const [rentalResult] = await db.query(
      `INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, total_days, total_cost, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [customerId, vehicle_id, start_date, end_date, totalDays, totalCost]
    );
    const rentalId = rentalResult.insertId;

    // Create payment record
    await db.query(
      `INSERT INTO payments (rental_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, 'paid')`,
      [rentalId, totalCost, payment_method || 'card_on_delivery']
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      rental: {
        rentalId,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        start_date,
        end_date,
        totalDays,
        totalCost,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating rental:', error);
    res.status(500).json({ success: false, message: 'Server error creating booking.' });
  }
});

// GET /api/rentals/my-bookings - Customer: View Own Bookings
router.get('/my-bookings', verifyToken, isCustomer, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const [rentals] = await db.query(
      `SELECT r.*, v.make, v.model, v.license_plate, v.image_url, c.name AS category_name, p.payment_method, p.payment_status
       FROM rentals r
       JOIN vehicles v ON r.vehicle_id = v.id
       JOIN vehicle_categories c ON v.category_id = c.id
       LEFT JOIN payments p ON r.id = p.rental_id
       WHERE r.customer_id = ?
       ORDER BY r.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, count: rentals.length, rentals });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching bookings.' });
  }
});

// GET /api/rentals - Admin: View All Customer Bookings
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*, 
             v.make, v.model, v.license_plate, v.image_url,
             cust.first_name, cust.last_name, cust.phone, cust.driver_license,
             u.email,
             p.payment_method, p.payment_status
      FROM rentals r
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN customers cust ON r.customer_id = cust.id
      JOIN users u ON cust.user_id = u.id
      LEFT JOIN payments p ON r.id = p.rental_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const [rentals] = await db.query(sql, params);
    res.json({ success: true, count: rentals.length, rentals });
  } catch (error) {
    console.error('Error fetching all rentals:', error);
    res.status(500).json({ success: false, message: 'Server error fetching rentals.' });
  }
});

// PUT /api/rentals/:id/status - Admin: Update Rental Status
router.put('/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const rentalId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const [rentals] = await db.query('SELECT * FROM rentals WHERE id = ?', [rentalId]);
    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }

    const rental = rentals[0];

    // Update rental status
    await db.query('UPDATE rentals SET status = ? WHERE id = ?', [status, rentalId]);

    // Update vehicle status automatically depending on rental state
    if (status === 'active') {
      await db.query("UPDATE vehicles SET status = 'rented' WHERE id = ?", [rental.vehicle_id]);
    } else if (status === 'completed' || status === 'cancelled') {
      await db.query("UPDATE vehicles SET status = 'available' WHERE id = ?", [rental.vehicle_id]);
    }

    res.json({ success: true, message: `Rental status updated to ${status}.` });
  } catch (error) {
    console.error('Error updating rental status:', error);
    res.status(500).json({ success: false, message: 'Server error updating status.' });
  }
});

// PUT /api/rentals/:id/cancel - Customer: Cancel Pending Booking
router.put('/:id/cancel', verifyToken, isCustomer, async (req, res) => {
  try {
    const rentalId = req.params.id;
    const customerId = req.user.customerId;

    const [rentals] = await db.query('SELECT * FROM rentals WHERE id = ? AND customer_id = ?', [rentalId, customerId]);
    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental booking not found.' });
    }

    const rental = rentals[0];
    if (rental.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be cancelled.' });
    }

    await db.query("UPDATE rentals SET status = 'cancelled' WHERE id = ?", [rentalId]);
    await db.query("UPDATE vehicles SET status = 'available' WHERE id = ?", [rental.vehicle_id]);

    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error('Error cancelling rental:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling booking.' });
  }
});

module.exports = router;
