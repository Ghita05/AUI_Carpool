const express = require('express');
const router = express.Router();
const review = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, review.writeReview);
router.put('/:reviewId', authenticate, review.modifyReview);
router.delete('/:reviewId', authenticate, review.deleteReview);
router.delete(
  '/:reviewId/admin',
  authenticate,
  authorize('Admin'),
  review.removeInappropriateReview
);

router.get('/user/:userId', authenticate, review.getUserReviews);
router.get('/user/:userId/rating', authenticate, review.getUserRatings);
router.get('/user/:userId/summary', authenticate, review.getReviewSummary);

module.exports = router;
