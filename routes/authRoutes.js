// routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validation'); // Import validation functions

const router = express.Router();

// --- UI Routes ---
router.get('/login', authController.getLoginPage);
router.post(
    '/login',
    loginValidation(), // Use validation middleware
    authController.loginUser
);

router.get('/register', authController.getRegisterPage);
router.post(
    '/register',
    registerValidation(), // Use validation middleware
    authController.registerUser
);

router.get('/logout', authController.logoutUser);

// --- API Routes ---
router.post(
    '/api/register',
    registerValidation(), // Use validation middleware
    authController.apiRegister
);

router.post(
    '/api/login',
    loginValidation(), // Use validation middleware
    authController.apiLogin
);

router.get('/api/logout', authController.apiLogout);

module.exports = router;