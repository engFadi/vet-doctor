// ----------------------------------------------------------------------
// Index routes
// Routes only define endpoints and delegate logic to controllers.
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

// Home / landing page
router.get('/', homeController.home);

module.exports = router;
