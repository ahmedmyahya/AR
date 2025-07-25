// middleware/authMiddleware.js

// Middleware to check if a user is authenticated for UI routes
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is authenticated, proceed to the next middleware/route handler
        return next();
    }
    // User is not authenticated, redirect to login page
    req.session.returnTo = req.originalUrl; // Store the original URL to redirect after login
    res.redirect('/login');
};

// Middleware to check if a user is authenticated for API routes
const isAuthenticatedApi = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is authenticated, proceed
        return next();
    }
    // User is not authenticated, send 401 Unauthorized response
    res.status(401).json({ message: 'Unauthorized: Please log in to access this resource.' });
};

module.exports = {
    isAuthenticated,
    isAuthenticatedApi,
};