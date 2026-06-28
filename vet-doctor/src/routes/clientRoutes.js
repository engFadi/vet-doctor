// ----------------------------------------------------------------------
// Client routes (Task 8)
// All routes require an authenticated client. Grows with later tasks
// (booking, payments, reviews).
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const clientController = require('../controllers/clientController');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../models/enums');

router.use(requireRole(ROLES.CLIENT));

// Animal profiles
router.get('/animals', clientController.listAnimals);
router.post('/animals', clientController.createAnimal);
router.get('/animals/:id/edit', clientController.showEditForm);
router.post('/animals/:id', clientController.updateAnimal);
router.post('/animals/:id/delete', clientController.deleteAnimal);

// Appointment booking
router.get('/book', clientController.showBookingForm);
router.post('/book', clientController.selectSlot);
router.post('/book/confirm', clientController.confirmBooking);

// Appointments
router.get('/appointments', clientController.listAppointments);
router.get('/appointments/:id/record', clientController.viewRecord);
router.post('/appointments/:id/cancel', clientController.cancelAppointment);

module.exports = router;
