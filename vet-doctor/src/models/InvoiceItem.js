// ----------------------------------------------------------------------
// InvoiceItem model (Task 13)
// One itemized post-visit charge on an invoice (SR6.5, SR6.9). Added by the
// veterinarian for medications, lab tests, or extended service time.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define(
    'InvoiceItem',
    {
      invoiceId: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
    },
    {
      tableName: 'invoice_items',
    }
  );

  InvoiceItem.associate = (db) => {
    InvoiceItem.belongsTo(db.Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
  };

  return InvoiceItem;
};
