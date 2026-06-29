// ----------------------------------------------------------------------
// Payment model (Task 13)
// Maps to the Payment class in docs/DOMAIN_MODEL.md. One payment per
// invoice. Cash payments start PENDING until the vet confirms receipt; card
// payments are processed by the mocked gateway in Task 14. Full card numbers
// are never stored - only a masked reference (SR6.15-6.16).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { PAYMENT_METHOD, PAYMENT_STATUS } = require('./enums');

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    'Payment',
    {
      invoiceId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paymentMethod: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_METHOD)),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
        allowNull: false,
        defaultValue: PAYMENT_STATUS.PENDING,
      },
      paymentDate: { type: DataTypes.DATE, allowNull: true },
      maskedCardReference: { type: DataTypes.STRING, allowNull: true },
      transactionReference: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'payments',
    }
  );

  Payment.associate = (db) => {
    Payment.belongsTo(db.Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
  };

  return Payment;
};
