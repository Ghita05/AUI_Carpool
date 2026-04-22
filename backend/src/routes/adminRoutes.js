const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const auth = require('../controllers/authController');
const review = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require a valid JWT for a user with role === 'Admin'
const guard = [authenticate, authorize('Admin')];

// ── Platform stats ────────────────────────────────────────────────────────────
router.get('/stats', ...guard, admin.getStats);

// ── User management ───────────────────────────────────────────────────────────
router.get('/users', ...guard, admin.getAllUsers);
router.get('/users/:userId', ...guard, admin.getUserDetail);
router.put('/users/:userId/suspend', ...guard, auth.suspendAccount);
router.put('/users/:userId/unsuspend', ...guard, admin.unsuspendAccount);
router.post('/users/:userId/warn', ...guard, auth.issueWarning);

// ── Ride management ───────────────────────────────────────────────────────────
router.get('/rides', ...guard, admin.getAllRides);
router.delete('/rides/:rideId', ...guard, admin.adminCancelRide);

// ── Review management ─────────────────────────────────────────────────────────
router.get('/reviews', ...guard, admin.getAllReviews);
router.delete('/reviews/:reviewId', ...guard, review.removeInappropriateReview);

module.exports = router;
