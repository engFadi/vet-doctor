// ----------------------------------------------------------------------
// Setting model (SR8.16, SR8.17)
// Simple key/value store for admin-configurable settings (supported payment
// methods, notification templates, etc.).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Setting = sequelize.define(
    'Setting',
    {
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'setting_key',
      },
      value: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'settings',
    }
  );

  return Setting;
};
