// ----------------------------------------------------------------------
// PerformanceReport model (Task 20)
// Maps to the PerformanceReport class in docs/DOMAIN_MODEL.md. Stores a
// snapshot of a monthly report's summary figures (SR8.10-8.12).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PerformanceReport = sequelize.define(
    'PerformanceReport',
    {
      reportPeriod: { type: DataTypes.STRING, allowNull: false, unique: true }, // YYYY-MM
      generatedDate: { type: DataTypes.DATEONLY, allowNull: false },
      totalBookings: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalRevenue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      profitMargin: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'performance_reports',
    }
  );

  return PerformanceReport;
};
