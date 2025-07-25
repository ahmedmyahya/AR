// models/Model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Model = sequelize.define('Model', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, // Generates a UUID automatically
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users', // Refers to the Users table (Sequelize pluralizes model names by default)
      key: 'id',
    },
  },
  modelName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true, // Description is optional
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false, // Path to the stored .glb file
  },
  fileSize: {
    type: DataTypes.BIGINT, // Use BIGINT for file size in bytes
    allowNull: false,
  },
  mimeType: { // Store the MIME type of the uploaded file
    type: DataTypes.STRING,
    allowNull: false,
  },
  hostingLink: {
    type: DataTypes.STRING,
    allowNull: false, // Generated URL for iframe embedding
    unique: true, // Ensure hosting links are unique
  },
  tags: { // Comma-separated tags (e.g., "animal,nature,mammal")
    type: DataTypes.STRING,
    allowNull: true, // Tags are optional
    defaultValue: '',
  },
  status: { // 'draft' or 'deployed'
    type: DataTypes.ENUM('draft', 'deployed'),
    allowNull: false,
    defaultValue: 'draft', // New uploads start as draft
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = Model;