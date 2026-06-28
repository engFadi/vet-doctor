// ----------------------------------------------------------------------
// Auth routes (Task 2)
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { redirectIfAuthenticated, requireAuth } = require('../middleware/auth');

router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
