// ----------------------------------------------------------------------
// Invoice service (Task 13)
// Helpers for generating invoices and labelling payment methods/statuses.
// ----------------------------------------------------------------------
const db = require('../models');
const { PAYMENT_METHOD, PAYMENT_STATUS } = require('../models/enums');

const { Op } = db.Sequelize;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Payment history for a user, optionally filtered by issue-date range (SR6.13).
// appointmentWhere scopes it to the client or veterinarian (SR6.11 / SR6.12).
async function getPaymentHistory({ appointmentWhere, from, to }) {
  const where = {};
  if (from) where.issueDate = { [Op.gte]: from };
  if (to) where.issueDate = { ...(where.issueDate || {}), [Op.lte]: to };

  return db.Invoice.findAll({
    where,
    include: [
      {
        model: db.Appointment,
        as: 'appointment',
        where: appointmentWhere,
        include: [
          { model: db.Service, as: 'service' },
          { model: db.User, as: 'veterinarian', attributes: ['id', 'fullName'] },
          { model: db.User, as: 'client', attributes: ['id', 'fullName'] },
        ],
      },
      { model: db.Payment, as: 'payment' },
    ],
    order: [['issueDate', 'DESC']],
  });
}

// Load a single appointment + full invoice graph for PDF generation,
// scoped to the requesting user via appointmentWhere.
async function loadInvoiceForPdf(appointmentId, appointmentWhere) {
  return db.Appointment.findOne({
    where: { id: appointmentId, ...appointmentWhere },
    include: [
      { model: db.Service, as: 'service' },
      { model: db.Animal, as: 'animal' },
      { model: db.User, as: 'veterinarian', attributes: ['id', 'fullName'] },
      {
        model: db.Invoice,
        as: 'invoice',
        include: [
          { model: db.InvoiceItem, as: 'items' },
          { model: db.Payment, as: 'payment' },
        ],
      },
    ],
  });
}

// Create the invoice for a completed appointment if one does not exist.
// The base amount comes from the service price (SR6.4).
async function ensureInvoiceForAppointment(appointment) {
  const existing = await db.Invoice.findOne({ where: { appointmentId: appointment.id } });
  if (existing) return existing;

  const service = await db.Service.findByPk(appointment.serviceId);
  const baseAmount = service ? Number(service.basePrice) : 0;

  return db.Invoice.create({
    appointmentId: appointment.id,
    issueDate: todayISO(),
    baseAmount,
    additionalCharges: 0,
    totalAmount: baseAmount,
    status: PAYMENT_STATUS.PENDING,
  });
}

// Create or update the single payment row for an invoice (one per invoice).
async function upsertPayment(invoice, fields) {
  let payment = await db.Payment.findOne({ where: { invoiceId: invoice.id } });
  if (payment) {
    payment.set(fields);
    await payment.save();
  } else {
    payment = await db.Payment.create({ invoiceId: invoice.id, ...fields });
  }
  return payment;
}

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH_ON_DELIVERY]: 'Cash',
  [PAYMENT_METHOD.CREDIT_DEBIT_CARD]: 'Credit/Debit Card',
};

const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Unpaid',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
};

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method;
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status;
}

module.exports = {
  ensureInvoiceForAppointment,
  upsertPayment,
  getPaymentHistory,
  loadInvoiceForPdf,
  paymentMethodLabel,
  paymentStatusLabel,
  todayISO,
};
