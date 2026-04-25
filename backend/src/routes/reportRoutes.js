const express = require('express');
const router  = express.Router();
const { createReport } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// Any logged-in user can submit a report
router.post('/', authenticate, createReport);

module.exports = router;
