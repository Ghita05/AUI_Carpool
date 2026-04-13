// ...existing code...
const express = require('express');
const router = express.Router();
const ride = require('../controllers/rideController');
const booking = require('../controllers/bookingController');
const rideRequest = require('../controllers/rideRequestController');
const { authenticate, authorize } = require('../middleware/auth');

// Transfer group owner (NEW)
router.put('/requests/:requestId/transfer-owner', authenticate, rideRequest.transferGroupOwner);

// ═══════════════════════════════════════════
// BULK USER FETCH (for group ride requests)
// ═══════════════════════════════════════════
const User = require('../models/User');
router.post('/users/by-ids', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ users: [] });
    const users = await User.find({ _id: { $in: ids } })
      .select('firstName lastName email auiId profilePicture _id');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'User bulk fetch failed.' });
  }
});
// Allow group member to leave a pending group request
router.put('/requests/:requestId/leave', authenticate, rideRequest.leaveRideRequest);
// ═══════════════════════════════════════════
// USER SEARCH (for group ride requests)
// ═══════════════════════════════════════════
router.get('/users/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const regex = new RegExp(q, 'i');
    const users = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { auiId: regex },
      ],
      accountStatus: 'Active',
    })
      .limit(10)
      .select('firstName lastName email auiId profilePicture _id');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'User search failed.' });
  }
});

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

// ─── Attendance (Building Block 2.4 — during-ride phase) ──────────────────
// GET returns the passenger list with their attendanceStatus for the check-in panel.
// PUT accepts { attendance: [{bookingId, status}] } from the driver.
// Both are Driver-only — need-to-know principle: passengers cannot see each other's status.
router.get('/:rideId/attendance', authenticate, authorize('Driver'), ride.getAttendance);
router.put('/:rideId/attendance', authenticate, authorize('Driver'), ride.markAttendance);

// ═══════════════════════════════════════════
// RIDE REQUESTS (Building Block 2.2)
// ═══════════════════════════════════════════
router.get('/requests/all', authenticate, rideRequest.getRideRequests);
router.get('/requests/my', authenticate, rideRequest.getMyRideRequests);
router.post('/requests', authenticate, rideRequest.postRideRequest);
router.put('/requests/:requestId', authenticate, rideRequest.modifyRideRequest);
router.delete('/requests/:requestId', authenticate, rideRequest.deleteRideRequest);
// Cancel entire group ride request (owner only, assumes all members agreed)
router.put('/requests/:requestId/cancel-group', authenticate, rideRequest.cancelGroupRideRequest);
router.put(
  '/requests/:requestId/accept',
  authenticate,
  authorize('Driver'),
  rideRequest.acceptRideRequest
);
router.put(
  '/requests/:requestId/dismiss',
  authenticate,
  authorize('Driver'),
  rideRequest.dismissRideRequest
);
router.put(
  '/requests/:requestId/dismiss',
  authenticate,
  authorize('Driver'),
  rideRequest.dismissRideRequest
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
router.put('/bookings/:bookingId/stop/respond', authenticate, booking.respondToStopRequest);
router.get('/:rideId/stops', authenticate, booking.getStopRequests);
router.delete('/bookings/:bookingId', authenticate, booking.cancelBooking);

module.exports = router;
