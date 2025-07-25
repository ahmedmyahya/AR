// routes/viewRoutes.js
const express = require('express');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Home page - redirects to dashboard if authenticated
router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('home', { title: 'Welcome to AR Model Platform' });
});

module.exports = router;