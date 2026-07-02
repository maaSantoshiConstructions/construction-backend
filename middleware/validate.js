import { check } from 'express-validator';

export const registerValidation = [
  check('name', 'Name is required').not().isEmpty().trim(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('phone', 'Phone number is required').not().isEmpty(),
];

export const loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').not().isEmpty(),
];

export const projectValidation = [
  check('name', 'Project name is required').not().isEmpty().trim(),
  check('slug', 'Slug is required').not().isEmpty().trim().toLowerCase(),
  check('type', 'Project type is required').not().isEmpty(),
];

export const plotValidation = [
  check('plotNumber', 'Plot number is required').not().isEmpty().trim(),
  check('project', 'Project reference is required').not().isEmpty().isMongoId(),
  check('size', 'Size must be a positive number').optional().isNumeric(),
  check('price', 'Price must be a positive number').optional().isNumeric(),
];

export const bookingValidation = [
  check('customer', 'Customer reference is required').not().isEmpty().isMongoId(),
  check('plot', 'Plot reference is required').not().isEmpty().isMongoId(),
  check('project', 'Project reference is required').not().isEmpty().isMongoId(),
  check('totalAmount', 'Total amount is required').isNumeric(),
];
