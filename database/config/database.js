const { Sequelize } = require("sequelize");
const path = require("path");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../../data/database.sqlite"),
  logging: false, // Set to true if you want SQL logs
});

module.exports = sequelize;