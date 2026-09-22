const { body, validationResult } = require('express-validator');

// Error handling middleware wrapper providing detailed error messages
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsgs = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMsgs}`,
      errors: errors.array().map(err => ({ field: err.path, msg: err.msg }))
    });
  }
  next();
};

// Validation rules (Cleaned of unneeded HTML escaping to prevent string corruption)
const validateRegistration = [
  body('email').trim().isEmail().withMessage('Valid email address required').normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('driver_license').trim().notEmpty().withMessage('Driver license is required'),
  body('address').trim().optional(),
  handleValidationErrors
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateVehicle = [
  body('category_id').isInt({ min: 1 }).withMessage('Valid Category ID is required'),
  body('make').trim().notEmpty().withMessage('Vehicle make is required'),
  body('model').trim().notEmpty().withMessage('Vehicle model is required'),
  body('year').isInt({ min: 1990, max: 2030 }).withMessage('Valid vehicle year required'),
  body('license_plate').trim().notEmpty().withMessage('License plate is required'),
  body('color').trim().notEmpty().withMessage('Color is required'),
  body('seating_capacity').isInt({ min: 1, max: 50 }).withMessage('Seating capacity must be between 1 and 50'),
  body('fuel_type').isIn(['Gasoline', 'Diesel', 'Hybrid', 'Electric']).withMessage('Invalid fuel type'),
  body('transmission').isIn(['Automatic', 'Manual']).withMessage('Invalid transmission type'),
  body('status').isIn(['available', 'rented', 'maintenance']).withMessage('Invalid status'),
  body('image_url').trim().optional(),
  handleValidationErrors
];

const validateCategory = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').trim().optional(),
  body('daily_rate').isFloat({ min: 0.01 }).withMessage('Daily rate must be greater than 0'),
  body('image_url').trim().optional(),
  handleValidationErrors
];

const validateRental = [
  body('vehicle_id').isInt({ min: 1 }).withMessage('Valid vehicle ID required'),
  body('start_date').isISO8601().withMessage('Valid start date required (YYYY-MM-DD)'),
  body('end_date').isISO8601().withMessage('Valid end date required (YYYY-MM-DD)'),
  body('payment_method').optional().isIn(['cash', 'card_on_delivery', 'bank_transfer']),
  handleValidationErrors
];

const validateReview = [
  body('vehicle_id').isInt({ min: 1 }).withMessage('Valid vehicle ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().optional(),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateVehicle,
  validateCategory,
  validateRental,
  validateReview
};
