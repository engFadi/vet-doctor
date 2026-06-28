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

const Animal = db.Animal;
const Service = db.Service;
const Slot = db.AvailabilitySlot;
const Appointment = db.Appointment;
const User = db.User;
const ANIMALS_LIST = '/client/animals';
const APPOINTMENTS_LIST = '/client/appointments';
const GENDERS = ['Male', 'Female', 'Unknown'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

    const slots = await findAvailableSlots(form.date);

    return res.render('pages/book-slots', {
      title: 'Choose a Time - Vet Doctor',
      form,
      service,
      animal,
      slots,
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
      slot = available[0];
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

    await Appointment.create({
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
      ],
      order: [['appointmentDateTime', 'DESC']],
    });

    res.render('pages/client-appointments', {
      title: 'My Appointments - Vet Doctor',
      appointments,
      now: new Date(),
      statuses: APPOINTMENT_STATUS,
    });
  } catch (err) {
    next(err);
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

    await appointment.cancel();

    // Release the slot back to available.
    if (appointment.slot && appointment.slot.status === AVAILABILITY_STATUS.BOOKED) {
      appointment.slot.status = AVAILABILITY_STATUS.AVAILABLE;
      await appointment.slot.save();
    }

    req.flash('success', 'Your appointment has been cancelled.');
    return res.redirect(APPOINTMENTS_LIST);
  } catch (err) {
    return next(err);
  }
};
