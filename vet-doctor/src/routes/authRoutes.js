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

// Password reset (SR2.6-2.8)
router.get('/forgot', redirectIfAuthenticated, authController.showForgot);
router.post('/forgot', redirectIfAuthenticated, authController.sendReset);
router.get('/reset/:token', redirectIfAuthenticated, authController.showReset);
router.post('/reset/:token', redirectIfAuthenticated, authController.resetPassword);

module.exports = router;
