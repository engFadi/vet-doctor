// ----------------------------------------------------------------------
// Invoice model (Task 13)
// Maps to the Invoice class in docs/DOMAIN_MODEL.md. One invoice per
// appointment: a base service charge plus itemized post-visit charges
// (SR6.4-SR6.9).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');
const { PAYMENT_STATUS } = require('./enums');

module.exports = (sequelize) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      appointmentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      issueDate: { type: DataTypes.DATEONLY, allowNull: false },
      baseAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      additionalCharges: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
        allowNull: false,
        defaultValue: PAYMENT_STATUS.PENDING,
      },
      // SR6.6: the client must acknowledge post-visit charges before paying.
      additionalChargesAcknowledged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'invoices',
    }
  );

  Invoice.associate = (db) => {
    Invoice.belongsTo(db.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
    Invoice.hasMany(db.InvoiceItem, { as: 'items', foreignKey: 'invoiceId' });
    Invoice.hasOne(db.Payment, { as: 'payment', foreignKey: 'invoiceId' });
    db.Appointment.hasOne(Invoice, { as: 'invoice', foreignKey: 'appointmentId' });
  };

  // Recompute additionalCharges + totalAmount from the line items.
  Invoice.prototype.recalculate = async function recalculate() {
    const items = await this.getItems();
    const additional = items.reduce((sum, item) => sum + Number(item.amount), 0);
    this.additionalCharges = additional;
    this.totalAmount = Number(this.baseAmount) + additional;
    await this.save();
    return this;
  };

  return Invoice;
};
