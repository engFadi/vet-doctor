// ----------------------------------------------------------------------
// Veterinarian controller (Task 7)
// Availability slot management: a veterinarian creates time slots and marks
// them available/unavailable. Booked slots are locked (SR5.3-SR5.4).
// This controller grows with later tasks (assigned appointments, records).
// ----------------------------------------------------------------------
const db = require('../models');
const { AVAILABILITY_STATUS, APPOINTMENT_STATUS } = require('../models/enums');
const emergencyService = require('../services/emergencyService');
const notificationService = require('../services/notificationService');
const invoiceService = require('../services/invoiceService');
const pdfService = require('../services/pdfService');
const { allowedTransitions, statusLabel } = require('../utils/appointmentStatus');
const { PAYMENT_METHOD, PAYMENT_STATUS, CONSULTATION_STATUS } = require('../models/enums');

const Slot = db.AvailabilitySlot;
const Appointment = db.Appointment;
const MedicalRecord = db.MedicalRecord;
const Prescription = db.Prescription;
const Invoice = db.Invoice;
const InvoiceItem = db.InvoiceItem;
const Payment = db.Payment;
const ConsultationRequest = db.ConsultationRequest;
const CONSULTATIONS_LIST = '/vet/consultations';
const SLOTS_LIST = '/vet/slots';
const EMERGENCIES_LIST = '/vet/emergencies';
const APPOINTMENTS_LIST = '/vet/appointments';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Load a slot that belongs to the logged-in veterinarian.
function findOwnSlot(req, id) {
  return Slot.findOne({
    where: { id, veterinarianId: req.session.user.id },
  });
}

// GET /vet/slots - list the veterinarian's own slots
exports.listSlots = async (req, res, next) => {
  try {
    const slots = await Slot.findAll({
      where: { veterinarianId: req.session.user.id },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });

    res.render('pages/vet-slots', {
      title: 'My Availability - Vet Doctor',
      slots,
      today: todayISO(),
      statuses: AVAILABILITY_STATUS,
    });
  } catch (err) {
    next(err);
  }
};

// POST /vet/slots - create a new available slot
exports.createSlot = async (req, res, next) => {
  try {
    const date = (req.body.date || '').trim();
    const startTime = (req.body.startTime || '').trim();
    const endTime = (req.body.endTime || '').trim();

    const errors = [];
    if (!date) errors.push('Date is required.');
    if (!startTime || !Slot.TIME_PATTERN.test(startTime)) {
      errors.push('A valid start time (HH:MM) is required.');
    }
    if (!endTime || !Slot.TIME_PATTERN.test(endTime)) {
      errors.push('A valid end time (HH:MM) is required.');
    }
    // Date must not be in the past (SR4.3: slots for the next 30 days).
    if (date && date < todayISO()) {
      errors.push('The slot date cannot be in the past.');
    }
    // End must be after start.
    if (startTime && endTime && Slot.TIME_PATTERN.test(startTime) &&
        Slot.TIME_PATTERN.test(endTime) && endTime <= startTime) {
      errors.push('End time must be after start time.');
    }

    // Prevent overlapping slots on the same date.
    if (errors.length === 0) {
      const sameDay = await Slot.findAll({
        where: { veterinarianId: req.session.user.id, date },
      });
      const overlaps = sameDay.some(
        (s) => startTime < s.endTime && endTime > s.startTime
      );
      if (overlaps) {
        errors.push('This slot overlaps an existing slot on the same date.');
      }
    }

    if (errors.length > 0) {
      errors.forEach((e) => req.flash('error', e));
      return res.redirect(SLOTS_LIST);
    }

    await Slot.create({
      veterinarianId: req.session.user.id,
      date,
      startTime,
      endTime,
      status: AVAILABILITY_STATUS.AVAILABLE,
    });

    req.flash('success', 'Availability slot added.');
    return res.redirect(SLOTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/slots/:id/unavailable - mark an available slot unavailable (SR5.3)
exports.markUnavailable = async (req, res, next) => {
  try {
    const slot = await findOwnSlot(req, req.params.id);
    if (!slot) {
      req.flash('error', 'Slot not found.');
      return res.redirect(SLOTS_LIST);
    }
    if (slot.status === AVAILABILITY_STATUS.BOOKED) {
      req.flash('error', 'A booked slot cannot be changed.');
      return res.redirect(SLOTS_LIST);
    }
    await slot.markUnavailable();
    req.flash('success', 'Slot marked as unavailable.');
    return res.redirect(SLOTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/slots/:id/available - reopen an unavailable slot
exports.markAvailable = async (req, res, next) => {
  try {
    const slot = await findOwnSlot(req, req.params.id);
    if (!slot) {
      req.flash('error', 'Slot not found.');
      return res.redirect(SLOTS_LIST);
    }
    if (slot.status === AVAILABILITY_STATUS.BOOKED) {
      req.flash('error', 'A booked slot cannot be changed.');
      return res.redirect(SLOTS_LIST);
    }
    slot.status = AVAILABILITY_STATUS.AVAILABLE;
    await slot.save();
    req.flash('success', 'Slot marked as available.');
    return res.redirect(SLOTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/slots/:id/delete - remove a slot (not allowed once booked)
exports.deleteSlot = async (req, res, next) => {
  try {
    const slot = await findOwnSlot(req, req.params.id);
    if (!slot) {
      req.flash('error', 'Slot not found.');
      return res.redirect(SLOTS_LIST);
    }
    if (slot.status === AVAILABILITY_STATUS.BOOKED) {
      req.flash('error', 'A booked slot cannot be deleted.');
      return res.redirect(SLOTS_LIST);
    }
    await slot.destroy();
    req.flash('success', 'Slot removed.');
    return res.redirect(SLOTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Emergency acknowledgement (Acknowledge Emergency Booking, SR3.10-3.11)
// ----------------------------------------------------------------------

// Load an emergency appointment assigned to this vet that still awaits ack.
function findOwnPendingEmergency(req, id) {
  return Appointment.findOne({
    where: {
      id,
      veterinarianId: req.session.user.id,
      priorityFlag: true,
      acknowledgedAt: null,
      status: emergencyService.AWAITING_ACK,
    },
  });
}

// GET /vet/emergencies - emergencies awaiting this vet's acknowledgement
exports.listEmergencies = async (req, res, next) => {
  try {
    const emergencies = await Appointment.findAll({
      where: {
        veterinarianId: req.session.user.id,
        priorityFlag: true,
        acknowledgedAt: null,
        status: emergencyService.AWAITING_ACK,
      },
      include: [
        { model: db.Service, as: 'service' },
        { model: db.Animal, as: 'animal' },
        { model: db.User, as: 'client', attributes: ['id', 'fullName', 'phoneNumber'] },
      ],
      order: [['acknowledgementDeadline', 'ASC']],
    });

    res.render('pages/vet-emergencies', {
      title: 'Emergency Requests - Vet Doctor',
      emergencies,
      now: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /vet/emergencies/:id/acknowledge (use case step 3-4)
exports.acknowledgeEmergency = async (req, res, next) => {
  try {
    const appointment = await findOwnPendingEmergency(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Emergency request not found or no longer awaiting your response.');
      return res.redirect(EMERGENCIES_LIST);
    }
    await emergencyService.acknowledge(appointment);
    req.flash('success', 'Emergency acknowledged. The client has been notified that you are assigned.');
    return res.redirect(EMERGENCIES_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/emergencies/:id/decline (A1 -> immediate reassignment)
exports.declineEmergency = async (req, res, next) => {
  try {
    const appointment = await findOwnPendingEmergency(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Emergency request not found or no longer awaiting your response.');
      return res.redirect(EMERGENCIES_LIST);
    }
    const result = await emergencyService.reassign(appointment);
    req.flash(
      'success',
      result.reassigned
        ? 'You declined the emergency. It has been reassigned to another veterinarian.'
        : 'You declined the emergency. No other veterinarian was available, so it has been escalated to the administrator.'
    );
    return res.redirect(EMERGENCIES_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Assigned appointments + status tracking (SR5.1-5.2, SR5.5-5.6)
// ----------------------------------------------------------------------

// GET /vet/appointments - the veterinarian's assigned appointments
exports.listAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { veterinarianId: req.session.user.id },
      include: [
        { model: db.Service, as: 'service' },
        { model: db.Animal, as: 'animal' },
        { model: db.User, as: 'client', attributes: ['id', 'fullName', 'phoneNumber'] },
      ],
      order: [['appointmentDateTime', 'ASC']], // SR5.1
    });

    res.render('pages/vet-appointments', {
      title: 'My Appointments - Vet Doctor',
      appointments,
      statuses: APPOINTMENT_STATUS,
      allowedTransitions,
    });
  } catch (err) {
    next(err);
  }
};

// POST /vet/appointments/:id/status - advance the appointment status (SR5.5)
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, veterinarianId: req.session.user.id },
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const nextStatus = (req.body.status || '').trim();
    const allowed = allowedTransitions(appointment);
    if (!allowed.includes(nextStatus)) {
      req.flash('error', 'That status change is not allowed.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    await appointment.updateStatus(nextStatus);

    // On completion, generate the invoice from the base service charge (SR6.4).
    if (nextStatus === APPOINTMENT_STATUS.COMPLETED) {
      await invoiceService.ensureInvoiceForAppointment(appointment);
    }

    // Notify the client of the status change (SR5.6 / SR7.4).
    await notificationService.notify({
      userId: appointment.clientId,
      subject: `Appointment ${statusLabel(nextStatus)}`,
      body: `Your appointment on ${new Date(
        appointment.appointmentDateTime
      ).toLocaleString()} is now "${statusLabel(nextStatus)}".`,
      appointmentId: appointment.id,
    });

    req.flash('success', `Appointment marked as ${statusLabel(nextStatus)}.`);
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Medical records & prescriptions (SR5.7-SR5.14)
// ----------------------------------------------------------------------

// Load an appointment assigned to this vet, with its record + invoice.
function findOwnAppointmentWithRecord(req, id) {
  return Appointment.findOne({
    where: { id, veterinarianId: req.session.user.id }, // SR5.13
    include: [
      { model: db.Service, as: 'service' },
      { model: db.Animal, as: 'animal' },
      { model: db.User, as: 'client', attributes: ['id', 'fullName'] },
      {
        model: MedicalRecord,
        as: 'medicalRecord',
        include: [{ model: Prescription, as: 'prescriptions' }],
      },
      {
        model: Invoice,
        as: 'invoice',
        include: [
          { model: InvoiceItem, as: 'items' },
          { model: Payment, as: 'payment' },
        ],
      },
    ],
  });
}

// GET /vet/appointments/:id/record - record form / existing record
exports.showRecordForm = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithRecord(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      req.flash('error', 'A medical record can only be added after the visit is completed.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    res.render('pages/vet-record', {
      title: 'Medical Record - Vet Doctor',
      appointment,
      record: appointment.medicalRecord,
      invoice: appointment.invoice,
      maxNotes: MedicalRecord.MAX_NOTES,
      paymentMethodLabel: invoiceService.paymentMethodLabel,
      paymentStatusLabel: invoiceService.paymentStatusLabel,
      statuses: PAYMENT_STATUS,
      methods: PAYMENT_METHOD,
    });
  } catch (err) {
    next(err);
  }
};

// POST /vet/appointments/:id/charges - add a post-visit charge (SR6.5-6.6)
exports.addCharge = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithRecord(req, req.params.id);
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'Invoice not found for this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    const recordUrl = `/vet/appointments/${appointment.id}/record`;

    if (appointment.invoice.status === PAYMENT_STATUS.PAID) {
      req.flash('error', 'This invoice is already paid and cannot be changed.');
      return res.redirect(recordUrl);
    }

    const description = (req.body.description || '').trim();
    const amount = Number(req.body.amount);
    if (!description) {
      req.flash('error', 'Charge description is required.');
      return res.redirect(recordUrl);
    }
    if (Number.isNaN(amount) || amount <= 0) {
      req.flash('error', 'Charge amount must be a positive number.');
      return res.redirect(recordUrl);
    }

    await InvoiceItem.create({ invoiceId: appointment.invoice.id, description, amount });
    await appointment.invoice.recalculate();

    // Adding charges resets acknowledgement, so the client must re-confirm (SR6.6).
    appointment.invoice.additionalChargesAcknowledged = false;
    await appointment.invoice.save();

    await notificationService.notify({
      userId: appointment.clientId,
      subject: 'Additional charge added',
      body: `A post-visit charge "${description}" was added to your invoice. Please review and acknowledge it.`,
      appointmentId: appointment.id,
    });

    req.flash('success', 'Charge added to the invoice.');
    return res.redirect(recordUrl);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/appointments/:id/confirm-cash - confirm cash receipt (SR6.8)
exports.confirmCash = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithRecord(req, req.params.id);
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'Invoice not found for this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    const recordUrl = `/vet/appointments/${appointment.id}/record`;
    const payment = appointment.invoice.payment;

    if (
      !payment ||
      payment.paymentMethod !== PAYMENT_METHOD.CASH_ON_DELIVERY ||
      payment.paymentStatus !== PAYMENT_STATUS.PENDING
    ) {
      req.flash('error', 'There is no pending cash payment to confirm.');
      return res.redirect(recordUrl);
    }

    payment.paymentStatus = PAYMENT_STATUS.PAID;
    payment.paymentDate = new Date();
    await payment.save();

    appointment.invoice.status = PAYMENT_STATUS.PAID;
    appointment.invoice.issueDate = invoiceService.todayISO();
    await appointment.invoice.save();

    // Invoice/receipt generated and sent to the client (SR6.8, SR6.10).
    await notificationService.notify({
      userId: appointment.clientId,
      subject: 'Payment received',
      body: `Your cash payment of ${Number(payment.amount).toFixed(
        2
      )} has been confirmed. Your invoice is now paid.`,
      appointmentId: appointment.id,
    });

    req.flash('success', 'Cash payment confirmed. The invoice is now paid.');
    return res.redirect(recordUrl);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Payment history + invoice PDF (SR6.12, SR6.14)
// ----------------------------------------------------------------------

// GET /vet/payments - the vet's payment history with optional date range
exports.paymentHistory = async (req, res, next) => {
  try {
    const from = (req.query.from || '').trim();
    const to = (req.query.to || '').trim();
    const invoices = await invoiceService.getPaymentHistory({
      appointmentWhere: { veterinarianId: req.session.user.id },
      from,
      to,
    });
    res.render('pages/payments-history', {
      title: 'Payment History - Vet Doctor',
      invoices,
      from,
      to,
      role: 'veterinarian',
      paymentMethodLabel: invoiceService.paymentMethodLabel,
      paymentStatusLabel: invoiceService.paymentStatusLabel,
      basePath: '/vet',
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// Consultation requests (SR7.13)
// ----------------------------------------------------------------------

function findOwnConsultation(req, id) {
  return ConsultationRequest.findOne({
    where: { id, veterinarianId: req.session.user.id, status: CONSULTATION_STATUS.PENDING },
  });
}

// GET /vet/consultations - pending consultation requests for this vet
exports.listConsultations = async (req, res, next) => {
  try {
    const consultations = await ConsultationRequest.findAll({
      where: { veterinarianId: req.session.user.id, status: CONSULTATION_STATUS.PENDING },
      include: [
        { model: db.User, as: 'client', attributes: ['id', 'fullName'] },
        { model: db.Appointment, as: 'appointment', include: [{ model: db.Service, as: 'service' }] },
      ],
      order: [['requestDate', 'ASC']],
    });
    res.render('pages/vet-consultations', {
      title: 'Consultation Requests - Vet Doctor',
      consultations,
    });
  } catch (err) {
    next(err);
  }
};

// POST /vet/consultations/:id/accept (SR7.13)
exports.acceptConsultation = async (req, res, next) => {
  try {
    const consultation = await findOwnConsultation(req, req.params.id);
    if (!consultation) {
      req.flash('error', 'Consultation request not found.');
      return res.redirect(CONSULTATIONS_LIST);
    }
    consultation.status = CONSULTATION_STATUS.ACCEPTED;
    consultation.scheduledTime = new Date();
    await consultation.save();

    await notificationService.notify({
      userId: consultation.clientId,
      subject: 'Consultation accepted',
      body: `Your ${consultation.consultationType} consultation request was accepted.`,
      appointmentId: consultation.appointmentId,
    });

    req.flash('success', 'Consultation accepted. The client has been notified.');
    return res.redirect(CONSULTATIONS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/consultations/:id/decline (SR7.13)
exports.declineConsultation = async (req, res, next) => {
  try {
    const consultation = await findOwnConsultation(req, req.params.id);
    if (!consultation) {
      req.flash('error', 'Consultation request not found.');
      return res.redirect(CONSULTATIONS_LIST);
    }
    consultation.status = CONSULTATION_STATUS.DECLINED;
    await consultation.save();

    await notificationService.notify({
      userId: consultation.clientId,
      subject: 'Consultation declined',
      body: `Your ${consultation.consultationType} consultation request was declined.`,
      appointmentId: consultation.appointmentId,
    });

    req.flash('success', 'Consultation declined. The client has been notified.');
    return res.redirect(CONSULTATIONS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /vet/appointments/:id/invoice/pdf - download invoice PDF
exports.downloadInvoicePdf = async (req, res, next) => {
  try {
    const appointment = await invoiceService.loadInvoiceForPdf(req.params.id, {
      veterinarianId: req.session.user.id,
    });
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'No invoice is available for this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    return pdfService.streamInvoicePdf(res, {
      appointment,
      invoice: appointment.invoice,
      currency: req.app.locals.currency,
    });
  } catch (err) {
    return next(err);
  }
};

// POST /vet/appointments/:id/record - create the medical record (SR5.7-5.12, 5.14)
exports.createRecord = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithRecord(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      req.flash('error', 'A medical record can only be added after the visit is completed.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (appointment.medicalRecord) {
      req.flash('error', 'A medical record already exists for this appointment.');
      return res.redirect(`/vet/appointments/${appointment.id}/record`);
    }

    const diagnosis = (req.body.diagnosis || '').trim();
    const notes = (req.body.notes || '').trim();
    const followUpDate = (req.body.followUpDate || '').trim();

    if (notes.length > MedicalRecord.MAX_NOTES) {
      req.flash('error', `Post-visit notes must be ${MedicalRecord.MAX_NOTES} characters or fewer.`);
      return res.redirect(`/vet/appointments/${appointment.id}/record`);
    }

    await MedicalRecord.create({
      appointmentId: appointment.id,
      animalId: appointment.animalId, // SR5.12
      veterinarianId: req.session.user.id,
      visitDate: todayISO(),
      diagnosis: diagnosis || null,
      notes: notes || null,
      attachedFile: req.file ? req.file.filename : null, // SR5.10
    });

    // Optional follow-up date (SR5.14).
    if (followUpDate) {
      await appointment.flagForFollowUp(followUpDate);
    }

    // Notify the client that their visit record is available.
    await notificationService.notify({
      userId: appointment.clientId,
      subject: 'Visit record added',
      body: `Dr. ${req.session.user.fullName} added a medical record for your visit.`,
      appointmentId: appointment.id,
    });

    req.flash('success', 'Medical record saved.');
    return res.redirect(`/vet/appointments/${appointment.id}/record`);
  } catch (err) {
    return next(err);
  }
};

// POST /vet/records/:recordId/prescriptions - add a prescription (SR5.9)
exports.addPrescription = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findOne({
      where: { id: req.params.recordId, veterinarianId: req.session.user.id }, // SR5.13
    });
    if (!record) {
      req.flash('error', 'Medical record not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const medicationName = (req.body.medicationName || '').trim();
    if (!medicationName) {
      req.flash('error', 'Medication name is required.');
      return res.redirect(`/vet/appointments/${record.appointmentId}/record`);
    }

    await Prescription.create({
      medicalRecordId: record.id,
      medicationName,
      dosage: (req.body.dosage || '').trim() || null,
      frequency: (req.body.frequency || '').trim() || null,
      duration: (req.body.duration || '').trim() || null,
      instructions: (req.body.instructions || '').trim() || null,
      issuedDate: todayISO(),
    });

    req.flash('success', 'Prescription added.');
    return res.redirect(`/vet/appointments/${record.appointmentId}/record`);
  } catch (err) {
    return next(err);
  }
};
