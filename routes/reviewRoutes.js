const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isCustomer } = require('../middleware/auth');
const { validateReview } = require('../middleware/validate');

// POST /api/reviews - Customer: Post Review for a Vehicle
router.post('/', verifyToken, isCustomer, validateReview, async (req, res) => {
  try {
    const { vehicle_id, rating, comment } = req.body;
    const customerId = req.user.customerId;

    // Verify customer has rented this vehicle in the past
    const [pastRentals] = await db.query(
      "SELECT id FROM rentals WHERE customer_id = ? AND vehicle_id = ? AND status = 'completed'",
      [customerId, vehicle_id]
    );

    if (pastRentals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for vehicles you have completed a rental with.'
      });
    }

    const [result] = await db.query(
      'INSERT INTO reviews (customer_id, vehicle_id, rating, comment) VALUES (?, ?, ?, ?)',
      [customerId, vehicle_id, rating, comment || '']
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      reviewId: result.insertId
    });
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ success: false, message: 'Server error posting review.' });
  }
});

// GET /api/reviews/recent - Public: Get top recent reviews across all vehicles
router.get('/recent', async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT r.*, c.first_name, c.last_name, v.make, v.model, v.image_url AS vehicle_image
       FROM reviews r
       JOIN customers c ON r.customer_id = c.id
       JOIN vehicles v ON r.vehicle_id = v.id
       ORDER BY r.created_at DESC LIMIT 6`
    );

    const formattedReviews = reviews.map(rev => ({
      ...rev,
      customer_name: `${rev.first_name} ${rev.last_name}`
    }));

    res.json({ success: true, count: formattedReviews.length, reviews: formattedReviews });
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ success: false, message: 'Server error fetching recent reviews.' });
  }
});

// GET /api/reviews/vehicle/:id - Public: Get reviews for specific vehicle
router.get('/vehicle/:id', async (req, res) => {
  try {
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

    res.json({ success: true, count: formattedReviews.length, reviews: formattedReviews });
  } catch (error) {
    console.error('Error fetching vehicle reviews:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reviews.' });
  }
});

module.exports = router;
