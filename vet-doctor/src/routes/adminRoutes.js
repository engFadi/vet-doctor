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

module.exports = router;
