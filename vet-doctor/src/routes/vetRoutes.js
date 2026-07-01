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
const { upload } = require('../middleware/upload');

router.use(requireRole(ROLES.VETERINARIAN));

// Wrap multer so an oversized/failed upload becomes a friendly flash (SR5.11).
function uploadAttachment(req, res, next) {
  upload.single('attachment')(req, res, (err) => {
    if (err) {
      req.flash(
        'error',
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Attachment exceeds the 10 MB limit.'
          : 'File upload failed.'
      );
      return res.redirect(`/vet/appointments/${req.params.id}/record`);
    }
    return next();
  });
}

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

// Medical records & prescriptions
router.get('/appointments/:id/record', vetController.showRecordForm);
router.post('/appointments/:id/record', uploadAttachment, vetController.createRecord);
router.post('/records/:recordId/prescriptions', vetController.addPrescription);

// Invoice charges & cash confirmation
router.post('/appointments/:id/charges', vetController.addCharge);
router.post('/appointments/:id/confirm-cash', vetController.confirmCash);
router.get('/appointments/:id/invoice/pdf', vetController.downloadInvoicePdf);

// Consultation requests
router.get('/consultations', vetController.listConsultations);
router.post('/consultations/:id/accept', vetController.acceptConsultation);
router.post('/consultations/:id/decline', vetController.declineConsultation);
router.post('/consultations/:id/remove', vetController.removeConsultation);

// Payment history
router.get('/payments', vetController.paymentHistory);

module.exports = router;
