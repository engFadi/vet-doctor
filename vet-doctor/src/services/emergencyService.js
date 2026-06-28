// ----------------------------------------------------------------------
// Emergency service (Task 10)
// Acknowledge Emergency Booking use case: acknowledge, decline, timeout
// reassignment to the next qualified veterinarian, or escalation to the
// administrator (SR3.9-SR3.11).
//
// Includes the VetRegistry.findNextQualifiedVet behaviour from the class
// model: find another available, approved veterinarian for the same slot.
// ----------------------------------------------------------------------
const db = require('../models');
const {
  ROLES,
  ACCOUNT_STATUS,
  AVAILABILITY_STATUS,
  APPOINTMENT_STATUS,
} = require('../models/enums');

const notificationService = require('./notificationService');

const { Op } = db.Sequelize;
const Appointment = db.Appointment;
const Slot = db.AvailabilitySlot;
const User = db.User;

// Configurable acknowledgement window (default 15 minutes, SR3.11).
const ACK_MINUTES = Number(process.env.EMERGENCY_ACK_MINUTES) || 15;

// States in which an emergency is still awaiting acknowledgement.
const AWAITING_ACK = [APPOINTMENT_STATUS.REQUESTED, APPOINTMENT_STATUS.REASSIGNED];

function newDeadline() {
  return new Date(Date.now() + ACK_MINUTES * 60 * 1000);
}

// Reconstruct the "HH:MM" start time from the appointment's date-time.
function startTimeOf(appointment) {
  const dt = new Date(appointment.appointmentDateTime);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return { date: dt.toISOString().slice(0, 10), startTime: `${hh}:${mm}` };
}

// VetRegistry.findNextQualifiedVet: an available slot at the same date/time
// belonging to a different approved, active veterinarian.
async function findNextQualifiedSlot(appointment, excludeVetId) {
  const { date, startTime } = startTimeOf(appointment);
  return Slot.findOne({
    where: {
      date,
      startTime,
      status: AVAILABILITY_STATUS.AVAILABLE,
      veterinarianId: { [Op.ne]: excludeVetId },
    },
    include: [
      {
        model: User,
        as: 'veterinarian',
        where: {
          role: ROLES.VETERINARIAN,
          isApproved: true,
          accountStatus: ACCOUNT_STATUS.ACTIVE,
        },
      },
    ],
    order: [['id', 'ASC']],
  });
}

// Free the slot currently held by the appointment, if any.
async function releaseSlot(appointment) {
  if (!appointment.slotId) return;
  const slot = await Slot.findByPk(appointment.slotId);
  if (slot && slot.status === AVAILABILITY_STATUS.BOOKED) {
    slot.status = AVAILABILITY_STATUS.AVAILABLE;
    await slot.save();
  }
}

// The assigned veterinarian acknowledges the emergency (use case step 3-4).
async function acknowledge(appointment) {
  appointment.acknowledgedAt = new Date();
  appointment.acknowledgementDeadline = null;
  appointment.status = APPOINTMENT_STATUS.VETERINARIAN_ASSIGNED;
  await appointment.save();

  // Confirm to the client that a veterinarian has accepted (use case step 5).
  await notificationService.notify({
    userId: appointment.clientId,
    subject: 'Emergency accepted',
    body: 'A veterinarian has acknowledged your emergency visit and is assigned.',
    appointmentId: appointment.id,
  });
  return appointment;
}

// Reassign to the next qualified veterinarian, or escalate to the admin.
// Used by both an explicit decline (A1) and the timeout path (E1/E2).
async function reassign(appointment) {
  await releaseSlot(appointment);

  const slot = await findNextQualifiedSlot(appointment, appointment.veterinarianId);

  if (slot) {
    appointment.veterinarianId = slot.veterinarianId;
    appointment.slotId = slot.id;
    appointment.acknowledgedAt = null;
    appointment.acknowledgementDeadline = newDeadline(); // restart deadline (E1)
    appointment.status = APPOINTMENT_STATUS.REASSIGNED;
    await appointment.save();

    slot.status = AVAILABILITY_STATUS.BOOKED;
    await slot.save();

    // Notify the client and the newly assigned veterinarian (E1).
    await notificationService.notify({
      userId: appointment.clientId,
      subject: 'Emergency reassigned',
      body: 'Your emergency visit has been reassigned to another available veterinarian.',
      appointmentId: appointment.id,
    });
    await notificationService.notify({
      userId: slot.veterinarianId,
      subject: 'Emergency assigned to you',
      body: 'An emergency visit has been assigned to you. Please acknowledge it promptly.',
      appointmentId: appointment.id,
    });

    return { reassigned: true, veterinarianId: slot.veterinarianId };
  }

  // E2: no alternative veterinarian -> escalate to the administrator.
  appointment.slotId = null;
  appointment.acknowledgementDeadline = null;
  appointment.status = APPOINTMENT_STATUS.ESCALATED;
  await appointment.save();

  // Notify the client; administrators see escalations on their dashboard.
  await notificationService.notify({
    userId: appointment.clientId,
    subject: 'No veterinarian currently available',
    body: 'No veterinarian is currently available for your emergency. It has been escalated to the administrator.',
    appointmentId: appointment.id,
  });

  return { reassigned: false };
}

// Sweep emergencies whose acknowledgement deadline has passed (SR3.11).
async function processExpiredAcknowledgements() {
  const expired = await Appointment.findAll({
    where: {
      priorityFlag: true,
      acknowledgedAt: null,
      status: { [Op.in]: AWAITING_ACK },
      acknowledgementDeadline: { [Op.lt]: new Date() },
    },
  });

  for (const appointment of expired) {
    // SR3.11: the booking is unacknowledged -> reassign or escalate.
    await reassign(appointment);
  }
  return expired.length;
}

module.exports = {
  ACK_MINUTES,
  AWAITING_ACK,
  newDeadline,
  acknowledge,
  reassign,
  findNextQualifiedSlot,
  processExpiredAcknowledgements,
};
