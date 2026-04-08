const express = require('express');
const router = express.Router();
const ride = require('../controllers/rideController');
const booking = require('../controllers/bookingController');
const rideRequest = require('../controllers/rideRequestController');
const { authenticate, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════
// RIDE OFFERS (Building Block 2.1)
// ═══════════════════════════════════════════
router.get('/', authenticate, ride.getAvailableRides);
router.get('/driver/my-rides', authenticate, ride.getMyRides);
router.get('/:rideId', authenticate, ride.getRideDetails);
router.post('/', authenticate, authorize('Driver'), ride.postRideOffer);
router.put('/:rideId', authenticate, authorize('Driver'), ride.modifyRide);
router.delete('/:rideId', authenticate, authorize('Driver'), ride.cancelRide);
router.put('/:rideId/complete', authenticate, authorize('Driver'), ride.completeRide);

// ═══════════════════════════════════════════
// RIDE REQUESTS (Building Block 2.2)
// ═══════════════════════════════════════════
router.get('/requests/all', authenticate, rideRequest.getRideRequests);
router.get('/requests/my', authenticate, rideRequest.getMyRideRequests);
router.post('/requests', authenticate, rideRequest.postRideRequest);
router.put('/requests/:requestId', authenticate, rideRequest.modifyRideRequest);
router.delete('/requests/:requestId', authenticate, rideRequest.deleteRideRequest);
router.put(
  '/requests/:requestId/accept',
  authenticate,
  authorize('Driver'),
  rideRequest.acceptRideRequest
);

// ═══════════════════════════════════════════
// BOOKINGS (Building Block 2.4)
// ═══════════════════════════════════════════
router.get('/bookings/current', authenticate, booking.getCurrentBookings);
router.get('/bookings/history', authenticate, booking.getBookingHistory);
router.get('/:rideId/passengers', authenticate, booking.getPassengerList);
router.post('/:rideId/bookings', authenticate, booking.bookRide);
router.post('/:rideId/bookings/group', authenticate, booking.bookGroupRide);
router.put('/bookings/:bookingId/luggage', authenticate, booking.declareLuggage);
router.put('/bookings/:bookingId/stop', authenticate, booking.requestAdditionalStop);
router.delete('/bookings/:bookingId', authenticate, booking.cancelBooking);

module.exports = router;
