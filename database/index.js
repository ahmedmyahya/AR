// database/index.js
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// SQLite database connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/database.sqlite", // Store DB file in a 'data' folder
  logging: false, // Set to true to see SQL queries in console
});

// Ensure 'data' directory exists
// NOTE: This check should ensure the top-level 'data' folder exists, not 'database/data'
const dataDir = path.join(__dirname, "..", "data"); // Go up one level to the root 'data' folder
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Import models
const User = require("./User")(sequelize, DataTypes);
const Model = require("./Model")(sequelize, DataTypes);

// Define associations
User.hasMany(Model, { foreignKey: "username", onDelete: "CASCADE" });
Model.belongsTo(User, { foreignKey: "username" });

// Add hooks to User model for password hashing (centralized here for all User operations)
User.beforeCreate(async (user) => {
  const saltRounds = 10;
  user.password = await bcrypt.hash(user.password, saltRounds);
});

User.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    const saltRounds = 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
});

// NOTE: Your `Model.js` file now explicitly defines `tags` as JSON.
// If you encounter issues with SQLite not correctly parsing/stringifying arrays
// from the JSON column, you might need to add getter/setter methods within `database/Model.js`
// similar to what was originally in app.js's Model definition.
// For example, in Model.js:
// tags: {
//   type: DataTypes.JSON,
//   defaultValue: [],
//   get() {
//     const rawValue = this.getDataValue('tags');
//     return typeof rawValue === 'string' && rawValue.startsWith('[') ? JSON.parse(rawValue) : rawValue;
//   },
//   set(value) {
//     this.setDataValue('tags', JSON.stringify(value));
//   }
// },

module.exports = {
  sequelize,
  User,
  Model,
};
