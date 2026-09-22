const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validate');

// GET /api/categories - Public: Get all vehicle categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT c.*, COUNT(v.id) AS vehicle_count 
       FROM vehicle_categories c 
       LEFT JOIN vehicles v ON c.id = v.category_id 
       GROUP BY c.id 
       ORDER BY c.name ASC`
    );
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error fetching categories.' });
  }
});

// GET /api/categories/:id - Public: Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM vehicle_categories WHERE id = ?', [req.params.id]);
    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, category: categories[0] });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/categories - Admin: Add new Category
router.post('/', verifyToken, isAdmin, validateCategory, async (req, res) => {
  try {
    const { name, description, daily_rate, image_url } = req.body;

    const [existing] = await db.query('SELECT id FROM vehicle_categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists.' });
    }

    const [result] = await db.query(
      'INSERT INTO vehicle_categories (name, description, daily_rate, image_url) VALUES (?, ?, ?, ?)',
      [name, description || '', daily_rate, image_url || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800']
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server error creating category.' });
  }
});

// PUT /api/categories/:id - Admin: Update Category
router.put('/:id', verifyToken, isAdmin, validateCategory, async (req, res) => {
  try {
    const { name, description, daily_rate, image_url } = req.body;
    const categoryId = req.params.id;

    const [existing] = await db.query('SELECT id FROM vehicle_categories WHERE id = ?', [categoryId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await db.query(
      'UPDATE vehicle_categories SET name = ?, description = ?, daily_rate = ?, image_url = ? WHERE id = ?',
      [name, description || '', daily_rate, image_url, categoryId]
    );

    res.json({ success: true, message: 'Category updated successfully!' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Server error updating category.' });
  }
});

// DELETE /api/categories/:id - Admin: Delete Category
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category is referenced by vehicles
    const [vehicles] = await db.query('SELECT id FROM vehicles WHERE category_id = ?', [categoryId]);
    if (vehicles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category: Vehicles are linked to this category. Delete or reassign vehicles first.'
      });
    }

    const [result] = await db.query('DELETE FROM vehicle_categories WHERE id = ?', [categoryId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({ success: true, message: 'Category deleted successfully!' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Server error deleting category.' });
  }
});

module.exports = router;
