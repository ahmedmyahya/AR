// utils/initDb.js
const db = require('../models'); // Import the database models and sequelize instance

async function initDb() {
  try {
    // Authenticate with the database
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with the database
    // { force: true } will drop existing tables and recreate them.
    // Use with caution in production! For development, it's useful.
    await db.sequelize.sync({ force: false }); // Set to false to prevent accidental data loss
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
  } finally {
    // Close the database connection
    await db.sequelize.close();
    console.log('Database connection closed.');
  }
}

initDb();