const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const modelController = require('../controllers/modelController');
const { registerValidation, loginValidation } = require('../utils/validation');
const { isAuthenticated, isAuthorized } = require('../middleware/authMiddleware');

// Auth API routes
router.post('/register', registerValidation(), authController.apiRegister);
router.post('/login', loginValidation(), authController.apiLogin);
router.post('/logout', authController.apiLogout); // For API-only logout

// Model API routes (require authentication)
router.delete('/models/:id', isAuthenticated, modelController.deleteModel);
router.put('/models/:id/status', isAuthenticated, modelController.updateModelStatus); // <--- ADD THIS LINE

module.exports = router;
