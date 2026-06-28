// ----------------------------------------------------------------------
// Veterinarian routes (Task 7)
// All routes require an authenticated veterinarian. Grows with later tasks
// (assigned appointments, medical records, emergencies).
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const vetController = require('../controllers/vetController');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../models/enums');

router.use(requireRole(ROLES.VETERINARIAN));

// Availability slots
router.get('/slots', vetController.listSlots);
router.post('/slots', vetController.createSlot);
router.post('/slots/:id/unavailable', vetController.markUnavailable);
router.post('/slots/:id/available', vetController.markAvailable);
router.post('/slots/:id/delete', vetController.deleteSlot);

// Emergency acknowledgement
router.get('/emergencies', vetController.listEmergencies);
router.post('/emergencies/:id/acknowledge', vetController.acknowledgeEmergency);
router.post('/emergencies/:id/decline', vetController.declineEmergency);

// Assigned appointments + status tracking
router.get('/appointments', vetController.listAppointments);
router.post('/appointments/:id/status', vetController.updateAppointmentStatus);

module.exports = router;
