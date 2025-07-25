const { body } = require('express-validator');

// Validation rules for user registration
exports.registerValidation = () => {
    return [
        body('username')
            .trim()
            .notEmpty().withMessage('Username is required.')
            .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.'),
        body('email')
            .trim()
            .isEmail().withMessage('Invalid email address.')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password is required.')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    ];
};

// Validation rules for user login
exports.loginValidation = () => {
    return [
        body('username').trim().notEmpty().withMessage('Username is required.'),
        body('password').notEmpty().withMessage('Password is required.'),
    ];
};

// Validation rules for model upload
exports.uploadValidation = () => {
    return [
        body('modelName')
            .trim()
            .notEmpty().withMessage('Model Name is required.')
            .isLength({ min: 1, max: 255 }).withMessage('Model Name must be between 1 and 255 characters.'),
        body('description')
            .optional({ checkFalsy: true }) // Allow empty or missing description
            .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
        body('tags')
            .optional({ checkFalsy: true }) // Tags are optional
            .isLength({ max: 255 }).withMessage('Tags cannot exceed 255 characters.'), // Max length for tags string
    ];
};