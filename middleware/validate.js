import { check, validationResult } from 'express-validator';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

export const registerValidation = [
  check('name', 'Name is required').not().isEmpty().trim(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('phone', 'Phone number is required').not().isEmpty(),
  handleValidationErrors,
];

export const loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').not().isEmpty(),
  handleValidationErrors,
];

export const projectValidation = [
  check('name', 'Project name is required').not().isEmpty().trim(),
  check('type', 'Project type is required').not().isEmpty(),
  handleValidationErrors,
];

export const plotValidation = [
  check('plotNumber', 'Plot number is required').not().isEmpty().trim(),
  check('project', 'Project reference is required').not().isEmpty().isMongoId(),
  check('size', 'Size must be a positive number').optional().isNumeric(),
  check('price', 'Price must be a positive number').optional().isNumeric(),
  handleValidationErrors,
];

export const bookingValidation = [
  check('customer', 'Customer reference is required').not().isEmpty().isMongoId(),
  check('plot', 'Plot reference is required').not().isEmpty().isMongoId(),
  check('project', 'Project reference is required').not().isEmpty().isMongoId(),
  check('totalAmount', 'Total amount is required').isNumeric(),
  handleValidationErrors,
];
