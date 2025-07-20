// database/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      username: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      theme: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "light",
      },
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  return User;
};
