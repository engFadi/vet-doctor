// ----------------------------------------------------------------------
// Service model (Task 6)
// Maps to the Service class in docs/DOMAIN_MODEL.md. One row per service
// type (Routine Check-Up, Emergency Visit, Farm Visit) with a base price
// the administrator can update (SR8.15). Used to price bookings (SR6.4).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { SERVICE_TYPE } = require('./enums');

module.exports = (sequelize) => {
  const Service = sequelize.define(
    'Service',
    {
      serviceType: {
        type: DataTypes.ENUM(...Object.values(SERVICE_TYPE)),
        allowNull: false,
        unique: true, // one entry per service type
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      // Estimated visit duration in minutes.
      estimatedDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0 },
      },
    },
    {
      tableName: 'services',
    }
  );

  // Operation from the class model: update the base price (SR8.15).
  Service.prototype.updatePrice = async function updatePrice(newPrice) {
    this.basePrice = newPrice;
    await this.save();
  };

  // Operation from the class model: human-readable summary.
  Service.prototype.getDetails = function getDetails() {
    return `${this.name} - ${this.basePrice} (${this.estimatedDuration || '?'} min)`;
  };

  return Service;
};
