// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Load environment variables

// Initialize Sequelize with SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL || './data/database.sqlite', // Path to SQLite database file
  logging: false, // Set to true to see SQL queries in console
});

module.exports = sequelize;