// ----------------------------------------------------------------------
// Notification model (Task 11)
// Stores in-app notifications delivered by the (mocked) Notification
// Service. Each notification belongs to one recipient user and may link to
// an appointment.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true },
      appointmentId: { type: DataTypes.INTEGER, allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'notifications',
    }
  );

  Notification.associate = (db) => {
    Notification.belongsTo(db.User, { as: 'recipient', foreignKey: 'userId' });
    db.User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
  };

  return Notification;
};
