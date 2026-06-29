// ----------------------------------------------------------------------
// Invoice service (Task 13)
// Helpers for generating invoices and labelling payment methods/statuses.
// ----------------------------------------------------------------------
const db = require('../models');
const { PAYMENT_METHOD, PAYMENT_STATUS } = require('../models/enums');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  paymentMethodLabel,
  paymentStatusLabel,
  todayISO,
};
