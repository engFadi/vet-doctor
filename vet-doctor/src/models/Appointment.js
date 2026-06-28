// ----------------------------------------------------------------------
// Appointment model (Task 9)
// Maps to the Appointment class in docs/DOMAIN_MODEL.md. Links a client, a
// veterinarian, a service, an animal, and the booked availability slot.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { APPOINTMENT_STATUS } = require('./enums');

module.exports = (sequelize) => {
  const Appointment = sequelize.define(
    'Appointment',
    {
      clientId: { type: DataTypes.INTEGER, allowNull: false },
      veterinarianId: { type: DataTypes.INTEGER, allowNull: false },
      serviceId: { type: DataTypes.INTEGER, allowNull: false },
      animalId: { type: DataTypes.INTEGER, allowNull: false },
      slotId: { type: DataTypes.INTEGER, allowNull: true },

      appointmentDateTime: { type: DataTypes.DATE, allowNull: false },
      visitLocation: { type: DataTypes.STRING, allowNull: false },
      reasonForVisit: { type: DataTypes.TEXT, allowNull: false },

      status: {
        type: DataTypes.ENUM(...Object.values(APPOINTMENT_STATUS)),
        allowNull: false,
        defaultValue: APPOINTMENT_STATUS.REQUESTED,
      },
      priorityFlag: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // true for Emergency Visit (SR3.9)
      },
      followUpDate: { type: DataTypes.DATEONLY, allowNull: true },
      acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'appointments',
    }
  );

  Appointment.associate = (db) => {
    Appointment.belongsTo(db.User, { as: 'client', foreignKey: 'clientId' });
    Appointment.belongsTo(db.User, { as: 'veterinarian', foreignKey: 'veterinarianId' });
    Appointment.belongsTo(db.Service, { as: 'service', foreignKey: 'serviceId' });
    Appointment.belongsTo(db.Animal, { as: 'animal', foreignKey: 'animalId' });
    Appointment.belongsTo(db.AvailabilitySlot, { as: 'slot', foreignKey: 'slotId' });

    db.User.hasMany(Appointment, { as: 'clientAppointments', foreignKey: 'clientId' });
    db.User.hasMany(Appointment, { as: 'vetAppointments', foreignKey: 'veterinarianId' });
  };

  // --- Operations from the class model ---
  Appointment.prototype.updateStatus = async function updateStatus(status) {
    this.status = status;
    await this.save();
  };

  Appointment.prototype.flagForFollowUp = async function flagForFollowUp(date) {
    this.followUpDate = date;
    await this.save();
  };

  // A client can cancel before the scheduled time (SR3.12). Releasing the
  // slot is handled by the controller so the model stays free of side effects.
  Appointment.prototype.cancel = async function cancel() {
    this.status = APPOINTMENT_STATUS.CANCELLED;
    await this.save();
  };

  return Appointment;
};
