// server.js
const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const flash = require('connect-flash'); // <--- ADD THIS LINE

// Import database and utility functions
const db = require('./models'); // This imports sequelize and models
const { ensureUploadsDir } = require('./utils/fileUtils'); // Ensure this is correctly imported

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists on server start
ensureUploadsDir();

// Middleware
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.json()); // For parsing application/json
app.use(methodOverride('_method')); // Enable method-override for DELETE/PUT forms

// Session configuration
app.use(session({
  store: new FileStore({
    path: './sessions', // Directory to store session files
    ttl: 86400, // Session TTL in seconds (1 day)
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // Only save session when a property is added
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
  },
}));

// Connect flash middleware - ADD THIS AFTER SESSION CONFIG
app.use(flash()); // <--- ADD THIS LINE

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/main'); // Set default layout

// Serve static files (CSS, client-side JS, uploaded models)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded models

// Import routes
const authRoutes = require('./routes/authRoutes');
const modelRoutes = require('./routes/modelRoutes');
const viewRoutes = require('./routes/viewRoutes'); // For home page

// Use routes
app.use('/', authRoutes); // Auth routes (login, register, logout, and their API equivalents)
app.use('/', modelRoutes); // Model routes (upload, dashboard, embed, and their API equivalents)
app.use('/', viewRoutes); // General view routes (home)

// Error handling for unmatched routes (404)
app.use((req, res, next) => {
  res.status(404).render('404', { title: '404 Not Found' }); // No username for 404/500
});

// Basic global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: '500 Server Error' }); // No username for 404/500
});

// Start the server - ENSURE DATABASE SYNCHRONIZATION HAPPENS HERE
db.sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    // IMPORTANT: Sync all models with the database.
    // Use { force: true } ONCE to drop and recreate tables if schema changed significantly
    // and you want to clear all data. Otherwise, use { alter: true } or no options.
    // For a fresh start, { force: true } is safe.
    return db.sequelize.sync({ force: false }); // Set to false for normal operation.
    // If you just deleted database.sqlite, it will create tables.
    // If you need to apply schema changes to existing tables, use { alter: true }
    // or run `npm run init-db` (which uses { force: false })
  })
  .then(() => {
    console.log('All models were synchronized successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database or sync models:', err);
    process.exit(1); // Exit process if database connection fails
  });