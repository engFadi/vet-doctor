// ----------------------------------------------------------------------
// Client controller (Task 8)
// Animal profile management: a client adds and maintains profiles for their
// animals (Customer 1 --< Animal). This controller grows with later tasks
// (booking, payments, reviews).
// ----------------------------------------------------------------------
const db = require('../models');
const {
  ROLES,
  ACCOUNT_STATUS,
  SERVICE_TYPE,
  AVAILABILITY_STATUS,
  APPOINTMENT_STATUS,
} = require('../models/enums');
const emergencyService = require('../services/emergencyService');
const notificationService = require('../services/notificationService');
const invoiceService = require('../services/invoiceService');
const paymentGateway = require('../services/paymentGateway');
const pdfService = require('../services/pdfService');
const reviewService = require('../services/reviewService');
const settingsService = require('../services/settingsService');
const { isActive } = require('../utils/appointmentStatus');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REVIEW_STATUS,
  CONSULTATION_STATUS,
} = require('../models/enums');

const Review = db.Review;
const ConsultationRequest = db.ConsultationRequest;
const CONSULTATION_TYPES = ['Video', 'Voice'];

const Invoice = db.Invoice;
const InvoiceItem = db.InvoiceItem;
const Payment = db.Payment;

const Animal = db.Animal;
const Service = db.Service;
const Slot = db.AvailabilitySlot;
const Appointment = db.Appointment;
const User = db.User;
const ANIMALS_LIST = '/client/animals';
const APPOINTMENTS_LIST = '/client/appointments';
const GENDERS = ['Male', 'Female', 'Unknown'];

// Cancellation policy (SR3.15): fee applies if cancelled within this window.
const CANCELLATION_WINDOW_HOURS = Number(process.env.CANCELLATION_WINDOW_HOURS) || 2;
const CANCELLATION_FEE = Number(process.env.CANCELLATION_FEE) || 20;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// SR3.7: does a veterinarian's service area match the requested location?
// Free-text, so we match case-insensitively in either direction.
function areaMatches(serviceArea, location) {
  const a = (serviceArea || '').trim().toLowerCase();
  const l = (location || '').trim().toLowerCase();
  if (!a || !l) return false;
  return l.includes(a) || a.includes(l);
}

// Available slots on a date from approved, active veterinarians (SR3.6-3.7).
function findAvailableSlots(date) {
  return Slot.findAll({
    where: { date, status: AVAILABILITY_STATUS.AVAILABLE },
    include: [
      {
        model: User,
        as: 'veterinarian',
        where: {
          role: ROLES.VETERINARIAN,
          isApproved: true,
          accountStatus: ACCOUNT_STATUS.ACTIVE,
        },
        attributes: ['id', 'fullName', 'specialization', 'serviceArea', 'averageRating'],
      },
    ],
    order: [['startTime', 'ASC']],
  });
}

// Load an animal owned by the logged-in client.
function findOwnAnimal(req, id) {
  return Animal.findOne({ where: { id, ownerId: req.session.user.id } });
}

// Validate + normalise submitted animal fields. Returns { data, errors }.
function parseAnimal(body) {
  const data = {
    name: (body.name || '').trim(),
    species: (body.species || '').trim(),
    breed: (body.breed || '').trim(),
    gender: (body.gender || '').trim(),
    age: null,
    weight: null,
  };
  const errors = [];

  if (!data.name) errors.push('Name is required.');
  if (!data.species) errors.push('Species is required.');

  const rawAge = (body.age || '').trim();
  if (rawAge !== '') {
    const age = Number(rawAge);
    if (!Number.isInteger(age) || age < 0) {
      errors.push('Age must be a whole number of years (0 or more).');
    } else {
      data.age = age;
    }
  }

  const rawWeight = (body.weight || '').trim();
  if (rawWeight !== '') {
    const weight = Number(rawWeight);
    if (Number.isNaN(weight) || weight < 0) {
      errors.push('Weight must be a non-negative number.');
    } else {
      data.weight = weight;
    }
  }

  if (data.gender && !GENDERS.includes(data.gender)) {
    errors.push('Please choose a valid gender.');
  }

  return { data, errors };
}

// GET /client/animals - list the client's animals
exports.listAnimals = async (req, res, next) => {
  try {
    const animals = await Animal.findAll({
      where: { ownerId: req.session.user.id },
      order: [['name', 'ASC']],
    });
    res.render('pages/client-animals', {
      title: 'My Animals - Vet Doctor',
      animals,
      genders: GENDERS,
      errors: [],
      form: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/animals - create a new animal
exports.createAnimal = async (req, res, next) => {
  try {
    const { data, errors } = parseAnimal(req.body);

    if (errors.length > 0) {
      const animals = await Animal.findAll({
        where: { ownerId: req.session.user.id },
        order: [['name', 'ASC']],
      });
      return res.status(400).render('pages/client-animals', {
        title: 'My Animals - Vet Doctor',
        animals,
        genders: GENDERS,
        errors,
        form: req.body,
      });
    }

    await Animal.create({ ...data, ownerId: req.session.user.id });
    req.flash('success', `${data.name} has been added.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /client/animals/:id/edit - edit form
exports.showEditForm = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }
    res.render('pages/client-animal-edit', {
      title: `Edit ${animal.name} - Vet Doctor`,
      animal,
      genders: GENDERS,
      errors: [],
      form: animal,
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/animals/:id - update an animal
exports.updateAnimal = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }

    const { data, errors } = parseAnimal(req.body);
    if (errors.length > 0) {
      return res.status(400).render('pages/client-animal-edit', {
        title: `Edit ${animal.name} - Vet Doctor`,
        animal,
        genders: GENDERS,
        errors,
        form: { ...req.body, id: animal.id },
      });
    }

    await animal.updateDetails(data);
    req.flash('success', `${animal.name} has been updated.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /client/animals/:id/delete - remove an animal
exports.deleteAnimal = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }
    const name = animal.name;
    await animal.destroy();
    req.flash('success', `${name} has been removed.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Appointment booking (Book Appointment use case, SR3.1-SR3.8)
// ----------------------------------------------------------------------

// Load the services + the client's animals needed by the booking form.
async function bookingFormData(req) {
  const [services, animals] = await Promise.all([
    Service.findAll({ order: [['id', 'ASC']] }),
    Animal.findAll({ where: { ownerId: req.session.user.id }, order: [['name', 'ASC']] }),
  ]);
  return { services, animals };
}

// Validate the step-1 booking details. Returns array of error strings.
function validateBookingDetails({ serviceId, animalId, reason, location, date }) {
  const errors = [];
  if (!serviceId) errors.push('Please choose a service type.');
  if (!animalId) errors.push('Please choose an animal.');
  if (!reason) errors.push('Please describe the reason for the visit.');
  if (!location) errors.push('Please enter the visit location.');
  if (!date) errors.push('Please choose a preferred date.');
  else if (date < todayISO()) errors.push('The preferred date cannot be in the past.');
  return errors;
}

// GET /client/book - step 1: booking details form
exports.showBookingForm = async (req, res, next) => {
  try {
    const { services, animals } = await bookingFormData(req);
    res.render('pages/book-appointment', {
      title: 'Book a Visit - Vet Doctor',
      services,
      animals,
      today: todayISO(),
      errors: [],
      form: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/book - step 2: show available slots for the chosen date
exports.selectSlot = async (req, res, next) => {
  try {
    const form = {
      serviceId: (req.body.serviceId || '').trim(),
      animalId: (req.body.animalId || '').trim(),
      reason: (req.body.reason || '').trim(),
      location: (req.body.location || '').trim(),
      date: (req.body.date || '').trim(),
    };

    const errors = validateBookingDetails(form);

    // Confirm the chosen animal/service belong to the client / exist.
    const [animal, service] = await Promise.all([
      form.animalId
        ? Animal.findOne({ where: { id: form.animalId, ownerId: req.session.user.id } })
        : null,
      form.serviceId ? Service.findByPk(form.serviceId) : null,
    ]);
    if (form.animalId && !animal) errors.push('Selected animal was not found.');
    if (form.serviceId && !service) errors.push('Selected service was not found.');

    if (errors.length > 0) {
      const { services, animals } = await bookingFormData(req);
      return res.status(400).render('pages/book-appointment', {
        title: 'Book a Visit - Vet Doctor',
        services,
        animals,
        today: todayISO(),
        errors,
        form,
      });
    }

    const allSlots = await findAvailableSlots(form.date);

    // SR3.7: prefer veterinarians whose service area matches the location.
    const matched = allSlots.filter((s) =>
      areaMatches(s.veterinarian.serviceArea, form.location)
    );
    const areaFiltered = matched.length > 0;
    const slots = areaFiltered ? matched : allSlots;

    return res.render('pages/book-slots', {
      title: 'Choose a Time - Vet Doctor',
      form,
      service,
      animal,
      slots,
      areaFiltered,
    });
  } catch (err) {
    return next(err);
  }
};

// POST /client/book/confirm - create the appointment (SR3.6 re-check)
exports.confirmBooking = async (req, res, next) => {
  try {
    const form = {
      serviceId: (req.body.serviceId || '').trim(),
      animalId: (req.body.animalId || '').trim(),
      reason: (req.body.reason || '').trim(),
      location: (req.body.location || '').trim(),
      date: (req.body.date || '').trim(),
    };
    const slotChoice = (req.body.slotId || '').trim();

    const errors = validateBookingDetails(form);
    const [animal, service] = await Promise.all([
      form.animalId
        ? Animal.findOne({ where: { id: form.animalId, ownerId: req.session.user.id } })
        : null,
      form.serviceId ? Service.findByPk(form.serviceId) : null,
    ]);
    if (!animal) errors.push('Selected animal was not found.');
    if (!service) errors.push('Selected service was not found.');
    if (!slotChoice) errors.push('Please choose a time slot.');

    if (errors.length > 0) {
      errors.forEach((e) => req.flash('error', e));
      return res.redirect('/client/book');
    }

    // Resolve the slot: a specific choice, or auto-assign the earliest (SR3.8).
    let slot;
    if (slotChoice === 'auto') {
      const available = await findAvailableSlots(form.date);
      // SR3.8 + SR3.7: prefer an area-matched vet, else the earliest available.
      const matched = available.filter((s) =>
        areaMatches(s.veterinarian.serviceArea, form.location)
      );
      slot = (matched.length ? matched : available)[0];
    } else {
      slot = await Slot.findByPk(slotChoice, {
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
      });
    }

    // SR3.6 / E1: slot must still be available at confirmation time.
    if (!slot || slot.status !== AVAILABILITY_STATUS.AVAILABLE) {
      req.flash('error', 'That time slot is no longer available. Please choose another.');
      return res.redirect('/client/book');
    }

    const appointmentDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
    const isEmergency = service.serviceType === SERVICE_TYPE.EMERGENCY_VISIT;

    const appointment = await Appointment.create({
      clientId: req.session.user.id,
      veterinarianId: slot.veterinarianId,
      serviceId: service.id,
      animalId: animal.id,
      slotId: slot.id,
      appointmentDateTime,
      visitLocation: form.location,
      reasonForVisit: form.reason,
      status: APPOINTMENT_STATUS.REQUESTED,
      priorityFlag: isEmergency, // SR3.9
      // Emergencies must be acknowledged within the deadline (SR3.10-3.11).
      acknowledgementDeadline: isEmergency ? emergencyService.newDeadline() : null,
    });

    await slot.markBooked(); // SR4.4 / SR5.4

    // Booking confirmation to client and veterinarian (SR7.1-7.2).
    const when = appointmentDateTime.toLocaleString();
    await notificationService.notify({
      userId: req.session.user.id,
      subject: isEmergency ? 'Emergency visit booked' : 'Booking confirmed',
      body: `${service.name} for ${animal.name} on ${when} at ${form.location}.`,
      appointmentId: appointment.id,
    });
    await notificationService.notify({
      userId: slot.veterinarianId,
      subject: isEmergency ? 'New emergency assigned' : 'New appointment assigned',
      body: `${service.name} for ${animal.name} on ${when} at ${form.location}.`,
      appointmentId: appointment.id,
    });

    req.flash(
      'success',
      isEmergency
        ? 'Emergency visit booked and flagged as high priority. The veterinarian is being notified.'
        : 'Your visit has been booked.'
    );
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /client/appointments - the client's appointments
exports.listAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: Animal, as: 'animal' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName', 'specialization'] },
        { model: Review, as: 'review' },
        { model: ConsultationRequest, as: 'consultations' },
      ],
      order: [['appointmentDateTime', 'DESC']],
    });

    res.render('pages/client-appointments', {
      title: 'My Appointments - Vet Doctor',
      appointments,
      now: new Date(),
      statuses: APPOINTMENT_STATUS,
      isActive,
      consultStatuses: CONSULTATION_STATUS,
    });
  } catch (err) {
    next(err);
  }
};

// GET /client/appointments/:id/record - read-only medical record + prescriptions
exports.viewRecord = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: Animal, as: 'animal' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName', 'specialization'] },
        {
          model: db.MedicalRecord,
          as: 'medicalRecord',
          include: [{ model: db.Prescription, as: 'prescriptions' }],
        },
      ],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (!appointment.medicalRecord) {
      req.flash('error', 'No medical record is available for this appointment yet.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    res.render('pages/client-record', {
      title: 'Visit Record - Vet Doctor',
      appointment,
      record: appointment.medicalRecord,
    });
  } catch (err) {
    next(err);
  }
};

// Load an appointment owned by the client, with its full invoice graph.
function findOwnAppointmentWithInvoice(req, id) {
  return Appointment.findOne({
    where: { id, clientId: req.session.user.id },
    include: [
      { model: Service, as: 'service' },
      { model: Animal, as: 'animal' },
      { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
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

// GET /client/appointments/:id/invoice - itemized invoice + pay options (SR6.9)
exports.showInvoice = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithInvoice(req, req.params.id);
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'No invoice is available for this appointment yet.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    res.render('pages/client-invoice', {
      title: 'Invoice - Vet Doctor',
      appointment,
      invoice: appointment.invoice,
      methods: PAYMENT_METHOD,
      statuses: PAYMENT_STATUS,
      enabledMethods: await settingsService.paymentMethods(), // SR8.16
      paymentMethodLabel: invoiceService.paymentMethodLabel,
      paymentStatusLabel: invoiceService.paymentStatusLabel,
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/appointments/:id/invoice/acknowledge - acknowledge charges (SR6.6)
exports.acknowledgeCharges = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithInvoice(req, req.params.id);
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'Invoice not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    appointment.invoice.additionalChargesAcknowledged = true;
    await appointment.invoice.save();
    req.flash('success', 'Additional charges acknowledged.');
    return res.redirect(`/client/appointments/${appointment.id}/invoice`);
  } catch (err) {
    return next(err);
  }
};

// POST /client/appointments/:id/invoice/pay-cash - choose cash payment (SR6.1)
exports.payCash = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithInvoice(req, req.params.id);
    if (!appointment || !appointment.invoice) {
      req.flash('error', 'Invoice not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    const invoice = appointment.invoice;
    const invoiceUrl = `/client/appointments/${appointment.id}/invoice`;

    // SR8.16: cash must be an enabled payment method.
    if (!(await settingsService.getBool('PAYMENT_CASH_ENABLED', true))) {
      req.flash('error', 'Cash payments are not currently available.');
      return res.redirect(invoiceUrl);
    }
    if (invoice.status === PAYMENT_STATUS.PAID) {
      req.flash('error', 'This invoice is already paid.');
      return res.redirect(invoiceUrl);
    }
    // SR6.6: additional charges must be acknowledged first.
    if (Number(invoice.additionalCharges) > 0 && !invoice.additionalChargesAcknowledged) {
      req.flash('error', 'Please acknowledge the additional charges before paying.');
      return res.redirect(invoiceUrl);
    }
    // A cash payment already awaiting confirmation.
    if (
      invoice.payment &&
      invoice.payment.paymentMethod === PAYMENT_METHOD.CASH_ON_DELIVERY &&
      invoice.payment.paymentStatus === PAYMENT_STATUS.PENDING
    ) {
      req.flash('error', 'A cash payment is already awaiting confirmation.');
      return res.redirect(invoiceUrl);
    }

    // Cash starts PENDING until the veterinarian confirms receipt (SR6.8).
    await invoiceService.upsertPayment(invoice, {
      amount: invoice.totalAmount,
      paymentMethod: PAYMENT_METHOD.CASH_ON_DELIVERY, // SR6.3
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentDate: null,
      maskedCardReference: null,
      transactionReference: null,
    });

    await notificationService.notify({
      userId: appointment.veterinarianId,
      subject: 'Cash payment pending',
      body: `The client chose to pay ${Number(invoice.totalAmount).toFixed(
        2
      )} in cash. Please confirm receipt after the visit.`,
      appointmentId: appointment.id,
    });

    req.flash('success', 'Cash selected. Please pay the veterinarian; they will confirm receipt.');
    return res.redirect(invoiceUrl);
  } catch (err) {
    return next(err);
  }
};

// Shared guard: invoice must exist, be unpaid, and have acknowledged charges.
function payableInvoiceOrRedirect(appointment, req, res) {
  const invoiceUrl = `/client/appointments/${appointment.id}/invoice`;
  const invoice = appointment.invoice;
  if (!invoice) {
    req.flash('error', 'Invoice not found.');
    res.redirect(APPOINTMENTS_LIST);
    return null;
  }
  if (invoice.status === PAYMENT_STATUS.PAID) {
    req.flash('error', 'This invoice is already paid.');
    res.redirect(invoiceUrl);
    return null;
  }
  if (Number(invoice.additionalCharges) > 0 && !invoice.additionalChargesAcknowledged) {
    req.flash('error', 'Please acknowledge the additional charges before paying.');
    res.redirect(invoiceUrl);
    return null;
  }
  return invoice;
}

// GET /client/appointments/:id/invoice/pay-card - the (mock) gateway form (SR6.2)
exports.showCardForm = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithInvoice(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    // SR8.16: card must be an enabled payment method.
    if (!(await settingsService.getBool('PAYMENT_CARD_ENABLED', true))) {
      req.flash('error', 'Card payments are not currently available.');
      return res.redirect(`/client/appointments/${appointment.id}/invoice`);
    }
    const invoice = payableInvoiceOrRedirect(appointment, req, res);
    if (!invoice) return undefined;

    return res.render('pages/client-pay-card', {
      title: 'Pay by Card - Vet Doctor',
      appointment,
      invoice,
      errors: [],
    });
  } catch (err) {
    return next(err);
  }
};

// POST /client/appointments/:id/invoice/pay-card - process card payment
exports.payCard = async (req, res, next) => {
  try {
    const appointment = await findOwnAppointmentWithInvoice(req, req.params.id);
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    // SR8.16: card must be an enabled payment method.
    if (!(await settingsService.getBool('PAYMENT_CARD_ENABLED', true))) {
      req.flash('error', 'Card payments are not currently available.');
      return res.redirect(`/client/appointments/${appointment.id}/invoice`);
    }
    const invoice = payableInvoiceOrRedirect(appointment, req, res);
    if (!invoice) return undefined;

    const card = {
      cardNumber: (req.body.cardNumber || '').trim(),
      cardHolderName: (req.body.cardHolderName || '').trim(),
      expiryDate: (req.body.expiryDate || '').trim(),
      cvv: (req.body.cvv || '').trim(),
    };

    // Validate card input before contacting the gateway.
    const errors = [];
    if (!card.cardHolderName) errors.push('Cardholder name is required.');
    const formatError = paymentGateway.validateCardInput(card);
    if (formatError) errors.push(formatError);
    if (errors.length > 0) {
      return res.status(400).render('pages/client-pay-card', {
        title: 'Pay by Card - Vet Doctor',
        appointment,
        invoice,
        errors,
      });
    }

    // Forward to the (mocked) gateway. The full card number is never stored.
    const result = paymentGateway.authorize({
      cardNumber: card.cardNumber,
      amount: Number(invoice.totalAmount),
    });
    const invoiceUrl = `/client/appointments/${appointment.id}/invoice`;

    if (result.status === 'approved') {
      // SR6.14: record payment with only a masked card reference (SR6.16).
      await invoiceService.upsertPayment(invoice, {
        amount: invoice.totalAmount,
        paymentMethod: PAYMENT_METHOD.CREDIT_DEBIT_CARD,
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentDate: new Date(),
        maskedCardReference: result.maskedCardReference,
        transactionReference: result.transactionReference,
      });
      invoice.status = PAYMENT_STATUS.PAID; // SR6.7
      invoice.issueDate = invoiceService.todayISO();
      await invoice.save();

      await notificationService.notify({
        userId: req.session.user.id,
        subject: 'Payment successful',
        body: `Your card payment of ${Number(invoice.totalAmount).toFixed(
          2
        )} was approved. Your invoice is now paid.`,
        appointmentId: appointment.id,
      });

      req.flash('success', 'Payment approved. Your invoice is now paid.');
      return res.redirect(invoiceUrl);
    }

    // E1 (declined) / E2 (gateway error): record the failed attempt, keep unpaid.
    await invoiceService.upsertPayment(invoice, {
      amount: invoice.totalAmount,
      paymentMethod: PAYMENT_METHOD.CREDIT_DEBIT_CARD,
      paymentStatus: PAYMENT_STATUS.FAILED,
      paymentDate: null,
      maskedCardReference: null,
      transactionReference: null,
    });

    req.flash('error', `${result.reason} Please try again or choose another method.`);
    return res.redirect(`/client/appointments/${appointment.id}/invoice/pay-card`);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Submit Review use case (SR9.3-9.8)
// ----------------------------------------------------------------------

// GET /client/appointments/:id/review - the review form
exports.showReviewForm = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
        { model: Review, as: 'review' },
      ],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    // SR9.6 / SR9.7: only completed appointments are eligible.
    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      req.flash('error', 'You can only review completed visits.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    // SR9.8 / E1: one review per appointment.
    if (appointment.review) {
      req.flash('error', 'You have already reviewed this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    res.render('pages/client-review', {
      title: 'Leave a Review - Vet Doctor',
      appointment,
      maxText: Review.MAX_TEXT,
      errors: [],
      form: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/appointments/:id/review - submit the review
exports.submitReview = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
        { model: Review, as: 'review' },
      ],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      req.flash('error', 'You can only review completed visits.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (appointment.review) {
      req.flash('error', 'You have already reviewed this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const ratingRaw = (req.body.rating || '').trim();
    const reviewText = (req.body.reviewText || '').trim();
    const errors = [];

    // E2: rating must be an integer 1-5.
    const rating = Number(ratingRaw);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push('Please provide a rating between 1 and 5.');
    }
    if (reviewText.length > Review.MAX_TEXT) {
      errors.push(`Your review must be ${Review.MAX_TEXT} characters or fewer.`);
    }

    if (errors.length > 0) {
      return res.status(400).render('pages/client-review', {
        title: 'Leave a Review - Vet Doctor',
        appointment,
        maxText: Review.MAX_TEXT,
        errors,
        form: { rating: ratingRaw, reviewText },
      });
    }

    // SR9.10/9.11: flagged reviews are held for admin moderation; clean
    // reviews are published immediately and counted in the average (SR9.13).
    const flagged = reviewService.isFlagged(reviewText);
    const status = flagged ? REVIEW_STATUS.PENDING : REVIEW_STATUS.APPROVED;

    await Review.create({
      appointmentId: appointment.id,
      clientId: req.session.user.id,
      veterinarianId: appointment.veterinarianId,
      rating,
      reviewText: reviewText || null,
      status,
    });

    if (!flagged) {
      await reviewService.recalcAverage(appointment.veterinarianId);
    }

    req.flash(
      'success',
      flagged
        ? 'Your review was submitted and is pending moderation.'
        : 'Thank you! Your review has been published.'
    );
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Consultation requests (SR7.12)
// ----------------------------------------------------------------------

// GET /client/appointments/:id/consult - request form
exports.showConsultForm = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
        { model: ConsultationRequest, as: 'consultations' },
      ],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (!isActive(appointment.status)) {
      req.flash('error', 'Consultations can only be requested for active appointments.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    res.render('pages/client-consult', {
      title: 'Request Consultation - Vet Doctor',
      appointment,
      types: CONSULTATION_TYPES,
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/appointments/:id/consult - create the request
exports.requestConsultation = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [{ model: ConsultationRequest, as: 'consultations' }],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (!isActive(appointment.status)) {
      req.flash('error', 'Consultations can only be requested for active appointments.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    // Block a new request while one is still pending or accepted.
    const open = (appointment.consultations || []).some((c) =>
      [CONSULTATION_STATUS.PENDING, CONSULTATION_STATUS.ACCEPTED].includes(c.status)
    );
    if (open) {
      req.flash('error', 'You already have an open consultation request for this appointment.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const consultationType = (req.body.consultationType || '').trim();
    const message = (req.body.message || '').trim();
    if (!CONSULTATION_TYPES.includes(consultationType)) {
      req.flash('error', 'Please choose a valid consultation type.');
      return res.redirect(`/client/appointments/${appointment.id}/consult`);
    }

    await ConsultationRequest.create({
      appointmentId: appointment.id,
      clientId: req.session.user.id,
      veterinarianId: appointment.veterinarianId,
      consultationType,
      message: message || null,
      status: CONSULTATION_STATUS.PENDING,
    });

    await notificationService.notify({
      userId: appointment.veterinarianId,
      subject: 'New consultation request',
      body: `A client requested a ${consultationType} consultation.`,
      appointmentId: appointment.id,
    });

    req.flash('success', 'Consultation requested. The veterinarian will respond shortly.');
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /client/payments - payment history with optional date range (SR6.11, 6.13)
exports.paymentHistory = async (req, res, next) => {
  try {
    const from = (req.query.from || '').trim();
    const to = (req.query.to || '').trim();
    const invoices = await invoiceService.getPaymentHistory({
      appointmentWhere: { clientId: req.session.user.id },
      from,
      to,
    });
    res.render('pages/payments-history', {
      title: 'Payment History - Vet Doctor',
      invoices,
      from,
      to,
      role: 'client',
      paymentMethodLabel: invoiceService.paymentMethodLabel,
      paymentStatusLabel: invoiceService.paymentStatusLabel,
      basePath: '/client',
    });
  } catch (err) {
    next(err);
  }
};

// GET /client/appointments/:id/invoice/pdf - download invoice PDF (SR6.14)
exports.downloadInvoicePdf = async (req, res, next) => {
  try {
    const appointment = await invoiceService.loadInvoiceForPdf(req.params.id, {
      clientId: req.session.user.id,
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

// POST /client/appointments/:id/cancel - cancel before the scheduled time (SR3.12)
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [{ model: Slot, as: 'slot' }],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if ([APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED].includes(appointment.status)) {
      req.flash('error', 'This appointment can no longer be cancelled.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (new Date(appointment.appointmentDateTime) <= new Date()) {
      req.flash('error', 'Appointments can only be cancelled before their scheduled time.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    // SR3.15: a cancellation fee applies if cancelled within the window.
    const hoursUntil = (new Date(appointment.appointmentDateTime) - Date.now()) / 3600000;
    const lateCancel = hoursUntil < CANCELLATION_WINDOW_HOURS;
    const currency = req.app.locals.currency;
    const when = new Date(appointment.appointmentDateTime).toLocaleString();

    await appointment.cancel();

    // Release the slot back to available.
    if (appointment.slot && appointment.slot.status === AVAILABILITY_STATUS.BOOKED) {
      appointment.slot.status = AVAILABILITY_STATUS.AVAILABLE;
      await appointment.slot.save();
    }

    const feeNote = lateCancel
      ? ` A cancellation fee of ${CANCELLATION_FEE} ${currency} applies because it was cancelled less than ${CANCELLATION_WINDOW_HOURS} hours before the visit.`
      : '';

    // Notify both the client and the assigned veterinarian (SR3.14).
    await notificationService.notify({
      userId: req.session.user.id,
      subject: 'Appointment cancelled',
      body: `Your appointment scheduled for ${when} has been cancelled.${feeNote}`,
      appointmentId: appointment.id,
    });
    await notificationService.notify({
      userId: appointment.veterinarianId,
      subject: 'Appointment cancelled',
      body: `The client cancelled the appointment scheduled for ${when}.`,
      appointmentId: appointment.id,
    });

    req.flash(
      'success',
      lateCancel
        ? `Your appointment has been cancelled.${feeNote}` // SR3.15 on-screen notice
        : 'Your appointment has been cancelled.'
    );
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /client/appointments/:id/reschedule - choose a new time (SR3.13)
exports.showReschedule = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [
        { model: Service, as: 'service' },
        { model: Animal, as: 'animal' },
        { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
      ],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (!isActive(appointment.status)) {
      req.flash('error', 'Only active appointments can be rescheduled.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (new Date(appointment.appointmentDateTime) <= new Date()) {
      req.flash('error', 'Appointments can only be rescheduled before their scheduled time.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const date = (req.query.date || todayISO()).trim();
    // Same veterinarian's available slots on the chosen date.
    const slots = await Slot.findAll({
      where: {
        veterinarianId: appointment.veterinarianId,
        date,
        status: AVAILABILITY_STATUS.AVAILABLE,
      },
      order: [['startTime', 'ASC']],
    });

    res.render('pages/client-reschedule', {
      title: 'Reschedule Appointment - Vet Doctor',
      appointment,
      slots,
      date,
      today: todayISO(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/appointments/:id/reschedule - move to a new available slot (SR3.13)
exports.reschedule = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, clientId: req.session.user.id },
      include: [{ model: Slot, as: 'slot' }],
    });
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (!isActive(appointment.status)) {
      req.flash('error', 'Only active appointments can be rescheduled.');
      return res.redirect(APPOINTMENTS_LIST);
    }
    if (new Date(appointment.appointmentDateTime) <= new Date()) {
      req.flash('error', 'Appointments can only be rescheduled before their scheduled time.');
      return res.redirect(APPOINTMENTS_LIST);
    }

    const slotId = (req.body.slotId || '').trim();
    // New slot must belong to the same vet and still be available (SR3.6).
    const newSlot = slotId
      ? await Slot.findOne({
          where: {
            id: slotId,
            veterinarianId: appointment.veterinarianId,
            status: AVAILABILITY_STATUS.AVAILABLE,
          },
        })
      : null;
    if (!newSlot) {
      req.flash('error', 'That time slot is no longer available. Please choose another.');
      return res.redirect(`/client/appointments/${appointment.id}/reschedule`);
    }

    // Release the old slot, book the new one.
    if (appointment.slot && appointment.slot.status === AVAILABILITY_STATUS.BOOKED) {
      appointment.slot.status = AVAILABILITY_STATUS.AVAILABLE;
      await appointment.slot.save();
    }
    await newSlot.markBooked();

    appointment.slotId = newSlot.id;
    appointment.appointmentDateTime = new Date(`${newSlot.date}T${newSlot.startTime}:00`);
    // New time -> reminders should fire again.
    appointment.reminder24hSent = false;
    appointment.reminder1hSent = false;
    await appointment.save();

    const when = appointment.appointmentDateTime.toLocaleString();
    // Notify both the client and the veterinarian (SR3.14).
    await notificationService.notify({
      userId: req.session.user.id,
      subject: 'Appointment rescheduled',
      body: `Your appointment has been rescheduled to ${when}.`,
      appointmentId: appointment.id,
    });
    await notificationService.notify({
      userId: appointment.veterinarianId,
      subject: 'Appointment rescheduled',
      body: `The client rescheduled their appointment to ${when}.`,
      appointmentId: appointment.id,
    });

    req.flash('success', `Your appointment has been rescheduled to ${when}.`);
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};
