// ----------------------------------------------------------------------
// Reminder service (Task 11)
// Sends 24-hour and 1-hour appointment reminders to the client and the
// assigned veterinarian (SR7.5 / SR7.6). Dedup flags prevent re-sending.
// ----------------------------------------------------------------------
const db = require('../models');
const { APPOINTMENT_STATUS } = require('../models/enums');
const notificationService = require('./notificationService');

const { Op } = db.Sequelize;
const Appointment = db.Appointment;

// Appointments that are still going ahead and may need reminders.
const ACTIVE_STATUSES = [
  APPOINTMENT_STATUS.REQUESTED,
  APPOINTMENT_STATUS.VETERINARIAN_ASSIGNED,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.EN_ROUTE,
  APPOINTMENT_STATUS.IN_PROGRESS,
];

async function sendReminderBatch(flagField, windowEnd, label) {
  const now = new Date();
  const due = await Appointment.findAll({
    where: {
      status: { [Op.in]: ACTIVE_STATUSES },
      [flagField]: false,
      appointmentDateTime: { [Op.gt]: now, [Op.lte]: windowEnd },
    },
  });

  for (const appt of due) {
    const when = new Date(appt.appointmentDateTime).toLocaleString();
    await notificationService.notifyMany([appt.clientId, appt.veterinarianId], {
      subject: `Appointment reminder (${label})`,
      body: `Reminder: you have an appointment on ${when}.`,
      appointmentId: appt.id,
    });
    appt[flagField] = true;
    await appt.save();
  }
  return due.length;
}

async function processReminders() {
  const now = Date.now();
  const in24h = new Date(now + 24 * 60 * 60 * 1000);
  const in1h = new Date(now + 60 * 60 * 1000);

  const count24 = await sendReminderBatch('reminder24hSent', in24h, '24 hours'); // SR7.5
  const count1 = await sendReminderBatch('reminder1hSent', in1h, '1 hour'); // SR7.6
  return count24 + count1;
}

module.exports = { processReminders };
