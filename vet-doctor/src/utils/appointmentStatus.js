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

// Vet-driven lifecycle transitions (SR5.5).
const TRANSITIONS = {
  [APPOINTMENT_STATUS.REQUESTED]: [APPOINTMENT_STATUS.CONFIRMED],
  [APPOINTMENT_STATUS.VETERINARIAN_ASSIGNED]: [APPOINTMENT_STATUS.CONFIRMED],
  [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.EN_ROUTE],
  [APPOINTMENT_STATUS.EN_ROUTE]: [APPOINTMENT_STATUS.IN_PROGRESS],
  [APPOINTMENT_STATUS.IN_PROGRESS]: [APPOINTMENT_STATUS.COMPLETED],
};

// The next status(es) a veterinarian may set for this appointment.
// Emergencies must be acknowledged (Task 10) before they can be confirmed.
function allowedTransitions(appointment) {
  if (
    appointment.status === APPOINTMENT_STATUS.REQUESTED &&
    appointment.priorityFlag
  ) {
    return [];
  }
  return TRANSITIONS[appointment.status] || [];
}

module.exports = { STATUS_LABELS, statusLabel, TRANSITIONS, allowedTransitions };
