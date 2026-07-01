// ----------------------------------------------------------------------
// Message model (SR7.7-7.11)
// A message in an appointment's conversation between the client and the
// assigned veterinarian. Supports text and an optional image attachment.
// Messages are retained (never auto-deleted) to satisfy the 12-month
// retention requirement (SR7.11).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define(
    'Message',
    {
      appointmentId: { type: DataTypes.INTEGER, allowNull: false },
      senderId: { type: DataTypes.INTEGER, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true }, // SR7.9 text
      imageFile: { type: DataTypes.STRING, allowNull: true }, // SR7.10 image
    },
    {
      tableName: 'messages',
    }
  );

  Message.associate = (db) => {
    Message.belongsTo(db.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
    Message.belongsTo(db.User, { as: 'sender', foreignKey: 'senderId' });
    db.Appointment.hasMany(Message, { as: 'messages', foreignKey: 'appointmentId' });
  };

  return Message;
};
