// ----------------------------------------------------------------------
// Veterinarian controller (Task 7)
// Availability slot management: a veterinarian creates time slots and marks
// them available/unavailable. Booked slots are locked (SR5.3-SR5.4).
// This controller grows with later tasks (assigned appointments, records).
// ----------------------------------------------------------------------
const db = require('../models');
const { AVAILABILITY_STATUS } = require('../models/enums');

const Slot = db.AvailabilitySlot;
const SLOTS_LIST = '/vet/slots';

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
