const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Production CORS Middleware setup to allow cross-origin requests from Firebase Hosting
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files for local monolithic execution
app.use(express.static(path.join(__dirname, 'public')));

// Ensure DB initialization before handling API requests
app.use(async (req, res, next) => {
  try {
    await db.initDB();
    next();
  } catch (err) {
    console.error('Database connection error in request middleware:', err);
    res.status(500).json({ success: false, message: 'Database initialization error.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);

// Health Check API (used by Render & Uptime Monitors)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Vehicle Rental Management System API',
    databaseMode: db.getMode(),
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for non-API routes (SPA navigation compatibility)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await db.initDB();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚗 Vehicle Rental Management System is running!`);
      console.log(`🌐 Application URL: http://localhost:${PORT}`);
      console.log(`📊 DB Mode: ${db.getMode().toUpperCase()}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
