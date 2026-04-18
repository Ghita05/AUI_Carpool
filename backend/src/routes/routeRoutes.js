const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const routeCtrl = require('../controllers/routeController');

// POST /api/routes/alternatives — fetch alternative routes from Google
router.post('/alternatives', authenticate, routeCtrl.getRouteAlternatives);

// GET /api/routes/:rideId — get stored route for a ride
router.get('/:rideId', authenticate, routeCtrl.getRouteForRide);

// POST /api/routes/validate-stop — check if a stop is on-route
router.post('/validate-stop', authenticate, routeCtrl.validateStop);

// PUT /api/routes/:rideId/location — driver shares live GPS
router.put('/:rideId/location', authenticate, authorize('Driver'), routeCtrl.shareDriverLocation);

module.exports = router;
