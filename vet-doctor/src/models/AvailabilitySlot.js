// ----------------------------------------------------------------------
// AvailabilitySlot model (Task 7)
// Maps to the AvailabilitySlot class in docs/DOMAIN_MODEL.md.
// Each slot belongs to one veterinarian. Times are stored as "HH:MM"
// strings alongside a calendar date for simple comparison and display.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { AVAILABILITY_STATUS } = require('./enums');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM, 24-hour

module.exports = (sequelize) => {
  const AvailabilitySlot = sequelize.define(
    'AvailabilitySlot',
    {
      veterinarianId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      startTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { is: TIME_PATTERN },
      },
      endTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { is: TIME_PATTERN },
      },
      status: {
        type: DataTypes.ENUM(...Object.values(AVAILABILITY_STATUS)),
        allowNull: false,
        defaultValue: AVAILABILITY_STATUS.AVAILABLE,
      },
    },
    {
      tableName: 'availability_slots',
    }
  );

  // A slot belongs to the veterinarian (a User with role 'veterinarian').
  AvailabilitySlot.associate = (db) => {
    AvailabilitySlot.belongsTo(db.User, {
      as: 'veterinarian',
      foreignKey: 'veterinarianId',
    });
    db.User.hasMany(AvailabilitySlot, {
      as: 'slots',
      foreignKey: 'veterinarianId',
    });
  };

  // --- Operations from the class model ---
  AvailabilitySlot.prototype.isAvailable = function isAvailable() {
    return this.status === AVAILABILITY_STATUS.AVAILABLE;
  };

  AvailabilitySlot.prototype.markUnavailable = async function markUnavailable() {
    this.status = AVAILABILITY_STATUS.UNAVAILABLE;
    await this.save();
  };

  AvailabilitySlot.prototype.markBooked = async function markBooked() {
    this.status = AVAILABILITY_STATUS.BOOKED;
    await this.save();
  };

  AvailabilitySlot.TIME_PATTERN = TIME_PATTERN;

  return AvailabilitySlot;
};
