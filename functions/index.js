const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../config/db');
const authRoutes = require('../routes/authRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const vehicleRoutes = require('../routes/vehicleRoutes');
const rentalRoutes = require('../routes/rentalRoutes');
const customerRoutes = require('../routes/customerRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const reviewRoutes = require('../routes/reviewRoutes');
const messageRoutes = require('../routes/messageRoutes');

// Initialize Firebase Admin SDK
admin.initializeApp();

const app = express();
const apiRouter = express.Router();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is initialized before processing request
app.use(async (req, res, next) => {
  try {
    await db.initDB();
    next();
  } catch (err) {
    console.error('DB Init Error in Cloud Function:', err);
    next(err);
  }
});

// API Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/rentals', rentalRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/messages', messageRoutes);

// Health Check API
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Vehicle Rental Management System - Firebase Cloud Function API',
    databaseMode: db.getMode(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRouter);

// Export Express app as a Firebase Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
