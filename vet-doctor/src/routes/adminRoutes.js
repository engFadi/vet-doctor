// ----------------------------------------------------------------------
// Admin routes (Task 5)
// All admin routes require an authenticated administrator. This file grows
// as later tasks add admin features (user management, reports, pricing).
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../models/enums');

router.use(requireRole(ROLES.ADMIN));

// Veterinarian approval workflow
router.get('/vets/pending', adminController.vetApprovals);
router.post('/vets/:id/approve', adminController.approveVet);
router.post('/vets/:id/reject', adminController.rejectVet);

// Service pricing management
router.get('/services', adminController.listServices);
router.post('/services/:id', adminController.updateService);

// Supported payment methods
router.get('/payment-methods', adminController.showPaymentMethods);
router.post('/payment-methods', adminController.updatePaymentMethods);

// Escalated emergencies
router.get('/emergencies', adminController.listEscalatedEmergencies);
router.post('/emergencies/:id/reassign', adminController.retryReassign);

// Review moderation
router.get('/reviews', adminController.listReviews);
router.post('/reviews/:id/approve', adminController.approveReview);
router.post('/reviews/:id/remove', adminController.removeReview);

// User account management
router.get('/users', adminController.listUsers);
router.post('/users/:id/status', adminController.changeUserStatus);

// Monthly reports
router.get('/reports', adminController.reports);
router.get('/reports/export.pdf', adminController.exportReportPdf);
router.get('/reports/export.csv', adminController.exportReportCsv);

module.exports = router;
