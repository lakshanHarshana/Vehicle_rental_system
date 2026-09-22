const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { validateVehicle } = require('../middleware/validate');

// GET /api/vehicles - Public: Search, Filter, & List Vehicles with Average Rating
router.get('/', async (req, res) => {
  try {
    const { search, category_id, status, fuel_type, transmission, min_price, max_price, seats } = req.query;

    let sql = `
      SELECT v.*, c.name AS category_name, c.daily_rate, c.description AS category_description,
             COALESCE(AVG(r.rating), 0) AS avg_rating,
             COUNT(r.id) AS review_count
      FROM vehicles v
      JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN reviews r ON v.id = r.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (v.make LIKE ? OR v.model LIKE ? OR v.license_plate LIKE ? OR c.name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (category_id) {
      sql += ` AND v.category_id = ?`;
      params.push(category_id);
    }

    if (status) {
      sql += ` AND v.status = ?`;
      params.push(status);
    }

    if (fuel_type) {
      sql += ` AND v.fuel_type = ?`;
      params.push(fuel_type);
    }

    if (transmission) {
      sql += ` AND v.transmission = ?`;
      params.push(transmission);
    }

    if (seats) {
      sql += ` AND v.seating_capacity >= ?`;
      params.push(seats);
    }

    if (min_price) {
      sql += ` AND c.daily_rate >= ?`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      sql += ` AND c.daily_rate <= ?`;
      params.push(parseFloat(max_price));
    }

    sql += ` GROUP BY v.id ORDER BY v.id DESC`;

    const [vehicles] = await db.query(sql, params);

    res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, message: 'Server error fetching vehicles.' });
  }
});

// GET /api/vehicles/:id - Public: Get single vehicle details & all reviews
router.get('/:id', async (req, res) => {
  try {
    const [vehicles] = await db.query(
      `SELECT v.*, c.name AS category_name, c.daily_rate, c.description AS category_description,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(r.id) AS review_count
       FROM vehicles v
       JOIN vehicle_categories c ON v.category_id = c.id
       LEFT JOIN reviews r ON v.id = r.vehicle_id
       WHERE v.id = ?
       GROUP BY v.id`,
      [req.params.id]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Get vehicle reviews (compatible with both MySQL & SQLite)
    const [reviews] = await db.query(
      `SELECT r.*, c.first_name, c.last_name
       FROM reviews r
       JOIN customers c ON r.customer_id = c.id
       WHERE r.vehicle_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    const formattedReviews = reviews.map(rev => ({
      ...rev,
      customer_name: `${rev.first_name} ${rev.last_name}`
    }));

    res.json({
      success: true,
      vehicle: vehicles[0],
      reviews: formattedReviews
    });
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching vehicle details.' });
  }
});

// POST /api/vehicles - Admin: Create new Vehicle
router.post('/', verifyToken, isAdmin, validateVehicle, async (req, res) => {
  try {
    const { category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status, image_url } = req.body;

    const [existingPlate] = await db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existingPlate.length > 0) {
      return res.status(400).json({ success: false, message: 'License plate already exists in system.' });
    }

    const defaultImg = 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800';

    const [result] = await db.query(
      `INSERT INTO vehicles 
       (category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status || 'available', image_url || defaultImg]
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully!',
      vehicleId: result.insertId
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ success: false, message: 'Server error creating vehicle.' });
  }
});

// PUT /api/vehicles/:id - Admin: Update Vehicle
router.put('/:id', verifyToken, isAdmin, validateVehicle, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status, image_url } = req.body;

    const [existing] = await db.query('SELECT id FROM vehicles WHERE id = ?', [vehicleId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const [plateCheck] = await db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate, vehicleId]);
    if (plateCheck.length > 0) {
      return res.status(400).json({ success: false, message: 'License plate is already assigned to another vehicle.' });
    }

    await db.query(
      `UPDATE vehicles SET 
       category_id = ?, make = ?, model = ?, year = ?, license_plate = ?, color = ?, 
       seating_capacity = ?, fuel_type = ?, transmission = ?, status = ?, image_url = ?
       WHERE id = ?`,
      [category_id, make, model, year, license_plate, color, seating_capacity, fuel_type, transmission, status, image_url, vehicleId]
    );

    res.json({ success: true, message: 'Vehicle updated successfully!' });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ success: false, message: 'Server error updating vehicle.' });
  }
});

// DELETE /api/vehicles/:id - Admin: Delete Vehicle
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const vehicleId = req.params.id;

    const [activeRentals] = await db.query("SELECT id FROM rentals WHERE vehicle_id = ? AND status IN ('pending', 'active')", [vehicleId]);
    if (activeRentals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with active or pending bookings. Cancel or complete bookings first.'
      });
    }

    const [result] = await db.query('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully!' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ success: false, message: 'Server error deleting vehicle.' });
  }
});

module.exports = router;
