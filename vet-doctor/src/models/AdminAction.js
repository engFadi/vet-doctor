// ----------------------------------------------------------------------
// AdminAction model (Task 19)
// Audit record of an administrator account-status action: who did it, to
// whom, what action, the reason, and the timestamp (SR8.9).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminAction = sequelize.define(
    'AdminAction',
    {
      adminId: { type: DataTypes.INTEGER, allowNull: false },
      adminName: { type: DataTypes.STRING, allowNull: false },
      targetUserId: { type: DataTypes.INTEGER, allowNull: false },
      action: { type: DataTypes.STRING, allowNull: false }, // e.g. "Set status to SUSPENDED"
      reason: { type: DataTypes.STRING, allowNull: false },
      // createdAt provides the timestamp.
    },
    {
      tableName: 'admin_actions',
    }
  );

  AdminAction.associate = (db) => {
    AdminAction.belongsTo(db.User, { as: 'admin', foreignKey: 'adminId' });
    AdminAction.belongsTo(db.User, { as: 'targetUser', foreignKey: 'targetUserId' });
  };

  return AdminAction;
};
