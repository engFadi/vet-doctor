// ----------------------------------------------------------------------
// Veterinarian directory routes (Task 17)
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const directoryController = require('../controllers/directoryController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', directoryController.listVets);
router.get('/:id', directoryController.showVet);

module.exports = router;
