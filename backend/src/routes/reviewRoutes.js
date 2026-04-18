const express  = require('express');
const router   = express.Router();
const review   = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

// ── Community leaderboard (Building Block 4 — public facing) ──────────────────
// Must be defined BEFORE /:reviewId routes to avoid Express parsing 'community' as an ID.
router.get('/community',                       authenticate, review.getCommunity);

// ── Driver analytics (Building Block 4 + driver profile display) ───────────────
router.get('/driver/:userId/analytics',        authenticate, review.getDriverAnalytics);

// ── Per-user reviews & ratings ─────────────────────────────────────────────────
// type=received (default) or type=given via ?type=given query param
router.get('/user/:userId',                    authenticate, review.getUserReviews);
router.get('/user/:userId/rating',             authenticate, review.getUserRatings);
router.get('/user/:userId/summary',            authenticate, review.getReviewSummary);

// ── Review CRUD ────────────────────────────────────────────────────────────────
router.post('/',                               authenticate, review.writeReview);
router.put('/:reviewId',                       authenticate, review.modifyReview);
router.delete('/:reviewId',                    authenticate, review.deleteReview);
router.delete('/:reviewId/admin', authenticate, authorize('Admin'), review.removeInappropriateReview);

module.exports = router;
