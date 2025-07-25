// controllers/authController.js
const { validationResult } = require('express-validator');
const db = require('../models'); // Import User model and Op from models/index.js

// Render login page
exports.getLoginPage = (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        error: req.query.error, // Pass error message from query params if any
        success: req.query.success, // Pass success message from query params if any
    });
};

// Handle user login
exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation errors, redirect back to login with errors
        const firstError = errors.array()[0].msg;
        return res.redirect(`/login?error=${encodeURIComponent(firstError)}`);
    }

    const { username, password } = req.body;

    try {
        const user = await db.User.findOne({ where: { username } });

        if (!user) {
            return res.redirect('/login?error=Invalid username or password.');
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.redirect('/login?error=Invalid username or password.');
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Redirect to the page user was trying to access, or dashboard
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo; // Clear the stored URL
        res.redirect(returnTo);

    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=An unexpected error occurred during login.');
    }
};

// Render registration page
exports.getRegisterPage = (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        error: req.query.error, // Pass error message from query params if any
    });
};

// Handle user registration
exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation errors, redirect back to register with errors
        const firstError = errors.array()[0].msg;
        return res.redirect(`/register?error=${encodeURIComponent(firstError)}`);
    }

    const { username, email, password } = req.body;

    try {
        // Check if username or email already exists
        const existingUser = await db.User.findOne({
            where: {
                [db.Op.or]: [{ username }, { email }] // Use db.Op.or
            }
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.redirect('/register?error=Username already taken.');
            }
            if (existingUser.email === email) {
                return res.redirect('/register?error=Email already registered.');
            }
        }

        // Create new user
        await db.User.create({
            username,
            email,
            passwordHash: password, // passwordHash will be automatically hashed by the User model hook
        });

        res.redirect('/login?success=Registration successful! Please log in.');

    } catch (error) {
        console.error('Registration error:', error);
        res.redirect('/register?error=An unexpected error occurred during registration.');
    }
};

// Handle user logout
exports.logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/login?success=You have been logged out.');
    });
};

// API endpoint for user registration
exports.apiRegister = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        const existingUser = await db.User.findOne({
            where: {
                [db.Op.or]: [{ username }, { email }] // Use db.Op.or
            }
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(409).json({ message: 'Username already taken.' });
            }
            if (existingUser.email === email) {
                return res.status(409).json({ message: 'Email already registered.' });
            }
        }

        const newUser = await db.User.create({
            username,
            email,
            passwordHash: password,
        });

        res.status(201).json({ message: 'User registered successfully.', userId: newUser.id });

    } catch (error) {
        console.error('API registration error:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
};

// API endpoint for user login
exports.apiLogin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const user = await db.User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Set session for API requests
        req.session.userId = user.id;
        req.session.username = user.username;

        res.status(200).json({ message: 'Login successful.', userId: user.id, username: user.username });

    } catch (error) {
        console.error('API login error:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
};

// API endpoint for user logout
exports.apiLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying API session:', err);
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully.' });
    });
};