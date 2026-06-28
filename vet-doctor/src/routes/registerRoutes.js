// ----------------------------------------------------------------------
// Registration routes (Task 3)
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const registerController = require('../controllers/registerController');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Logged-in users should not register new accounts.
router.use(redirectIfAuthenticated);

router.get('/', registerController.showChoice);
router.get('/client', registerController.showClientForm);
router.post('/client', registerController.registerClient);
router.get('/veterinarian', registerController.showVetForm);
router.post('/veterinarian', registerController.registerVet);

module.exports = router;
