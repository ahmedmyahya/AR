// database/Model.js

module.exports = (sequelize, DataTypes) => {
  const Model = sequelize.define("Model", {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    extension: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue("tags");
        return typeof rawValue === "string" && rawValue.startsWith("[")
          ? JSON.parse(rawValue)
          : rawValue;
      },
      set(value) {
        this.setDataValue("tags", Array.isArray(value) ? value : []);
      },
    },
  });

  return Model;
};
