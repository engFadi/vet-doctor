// ----------------------------------------------------------------------
// Review model (Task 16)
// Maps to the Review class in docs/DOMAIN_MODEL.md. One review per
// appointment (SR9.8), linked to the client and the veterinarian. Content
// moderation and average-rating updates are added in Task 17.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { REVIEW_STATUS } = require('./enums');

const MAX_TEXT = 500; // SR9.5

module.exports = (sequelize) => {
  const Review = sequelize.define(
    'Review',
    {
      // One review per appointment enforces the no-duplicate rule (SR9.8).
      appointmentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      clientId: { type: DataTypes.INTEGER, allowNull: false },
      veterinarianId: { type: DataTypes.INTEGER, allowNull: false },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }, // SR9.3
      },
      reviewText: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, MAX_TEXT] }, // SR9.5
      },
      status: {
        type: DataTypes.ENUM(...Object.values(REVIEW_STATUS)),
        allowNull: false,
        defaultValue: REVIEW_STATUS.PENDING,
      },
      submissionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'reviews',
    }
  );

  Review.associate = (db) => {
    Review.belongsTo(db.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
    Review.belongsTo(db.User, { as: 'client', foreignKey: 'clientId' });
    Review.belongsTo(db.User, { as: 'veterinarian', foreignKey: 'veterinarianId' });
    db.Appointment.hasOne(Review, { as: 'review', foreignKey: 'appointmentId' });
    db.User.hasMany(Review, { as: 'reviews', foreignKey: 'veterinarianId' });
  };

  Review.MAX_TEXT = MAX_TEXT;
  return Review;
};
