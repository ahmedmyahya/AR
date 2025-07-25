// models/index.js
const sequelize = require('../config/database');
const User = require('./User');
const Model = require('./Model');
const { Op } = require('sequelize'); // Import Op for Sequelize operators

// Define associations
// A User can have many Models
User.hasMany(Model, {
  foreignKey: 'userId',
  onDelete: 'CASCADE', // If a user is deleted, their models are also deleted
});

// A Model belongs to a single User
Model.belongsTo(User, {
  foreignKey: 'userId',
});

const db = {
  sequelize,
  User,
  Model,
  Op, // Export Op for easy access in controllers
};

module.exports = db;