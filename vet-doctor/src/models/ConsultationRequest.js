// ----------------------------------------------------------------------
// ConsultationRequest model (Task 18)
// Maps to the ConsultationRequest class in docs/DOMAIN_MODEL.md. A client
// requests an online consultation for an active appointment; the assigned
// veterinarian accepts or declines it (SR7.12-SR7.13).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { CONSULTATION_STATUS } = require('./enums');

module.exports = (sequelize) => {
  const ConsultationRequest = sequelize.define(
    'ConsultationRequest',
    {
      appointmentId: { type: DataTypes.INTEGER, allowNull: false },
      clientId: { type: DataTypes.INTEGER, allowNull: false },
      veterinarianId: { type: DataTypes.INTEGER, allowNull: false },
      requestDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      consultationType: { type: DataTypes.STRING, allowNull: false }, // Voice / Video
      message: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...Object.values(CONSULTATION_STATUS)),
        allowNull: false,
        defaultValue: CONSULTATION_STATUS.PENDING,
      },
      scheduledTime: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'consultation_requests',
    }
  );

  ConsultationRequest.associate = (db) => {
    ConsultationRequest.belongsTo(db.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
    ConsultationRequest.belongsTo(db.User, { as: 'client', foreignKey: 'clientId' });
    ConsultationRequest.belongsTo(db.User, { as: 'veterinarian', foreignKey: 'veterinarianId' });
    db.Appointment.hasMany(ConsultationRequest, { as: 'consultations', foreignKey: 'appointmentId' });
  };

  return ConsultationRequest;
};
