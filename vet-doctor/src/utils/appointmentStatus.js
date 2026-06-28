// ----------------------------------------------------------------------
// Appointment status helpers (Task 9)
// Friendly labels for the AppointmentStatus enum. Used across views.
// ----------------------------------------------------------------------
const { APPOINTMENT_STATUS } = require('../models/enums');

const STATUS_LABELS = {
  [APPOINTMENT_STATUS.REQUESTED]: 'Booked',
  [APPOINTMENT_STATUS.VETERINARIAN_ASSIGNED]: 'Vet Assigned',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmed',
  [APPOINTMENT_STATUS.EN_ROUTE]: 'En Route',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'In Progress',
  [APPOINTMENT_STATUS.COMPLETED]: 'Completed',
  [APPOINTMENT_STATUS.CANCELLED]: 'Cancelled',
  [APPOINTMENT_STATUS.UNACKNOWLEDGED]: 'Unacknowledged',
  [APPOINTMENT_STATUS.REASSIGNED]: 'Reassigned',
  [APPOINTMENT_STATUS.ESCALATED]: 'Escalated',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

module.exports = { STATUS_LABELS, statusLabel };
