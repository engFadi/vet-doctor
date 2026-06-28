// ----------------------------------------------------------------------
// Notification routes (Task 11)
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, notificationController.list);

module.exports = router;
