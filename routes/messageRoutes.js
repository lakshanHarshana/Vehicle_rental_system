const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, isCustomer, isAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_2026';

// Validation rule for submitting contact message
const validateMessage = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail({ gmail_remove_dots: false }),
  body('subject').trim().notEmpty().withMessage('Subject is required').escape(),
  body('message').trim().notEmpty().withMessage('Message body is required').escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, msg: err.msg }))
      });
    }
    next();
  }
];

// POST /api/messages - Submit message (Public or Logged-in Customer)
router.post('/', validateMessage, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    let userId = null;

    // Extract token if logged in
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId || null;
      } catch (e) {}
    }

    const [result] = await db.query(
      'INSERT INTO contact_messages (user_id, name, email, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, subject, message, 'unread']
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent to our support team.',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
});

// GET /api/messages/my-messages - Customer: View Own Sent Messages & Admin Replies
router.get('/my-messages', verifyToken, isCustomer, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const [messages] = await db.query(
      'SELECT * FROM contact_messages WHERE user_id = ? OR LOWER(email) = LOWER(?) ORDER BY created_at DESC',
      [userId, userEmail]
    );

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error('Error fetching customer messages:', error);
    res.status(500).json({ success: false, message: 'Server error fetching your support messages.' });
  }
});

// GET /api/messages - Admin: Get all customer contact messages
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const [messages] = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages.' });
  }
});

// POST /api/messages/:id/reply - Admin: Reply to Customer Message
router.post('/:id/reply', verifyToken, isAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message text is required.' });
    }

    const [result] = await db.query(
      "UPDATE contact_messages SET admin_reply = ?, replied_at = CURRENT_TIMESTAMP, status = 'replied' WHERE id = ?",
      [reply.trim(), messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    res.json({ success: true, message: 'Reply sent to customer successfully!' });
  } catch (error) {
    console.error('Error sending message reply:', error);
    res.status(500).json({ success: false, message: 'Server error replying to message.' });
  }
});

// PUT /api/messages/:id/read - Admin: Mark message as read
router.put('/:id/read', verifyToken, isAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    const [result] = await db.query(
      "UPDATE contact_messages SET status = 'read' WHERE id = ? AND status != 'replied'",
      [messageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or already replied.' });
    }

    res.json({ success: true, message: 'Message marked as read.' });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ success: false, message: 'Server error updating message.' });
  }
});

// DELETE /api/messages/:id - Admin: Delete message
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [messageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Server error deleting message.' });
  }
});

module.exports = router;
