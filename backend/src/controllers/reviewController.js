const { Review, User, Booking } = require('../models');
const { success, error } = require('../utils/responses');

const recalculateRating = async (userId) => {
  const reviews = await Review.find({ subjectId: userId });
  if (reviews.length === 0) {
    await User.findByIdAndUpdate(userId, { averageRating: 0 });
    return 0;
  }
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = Math.round((total / reviews.length) * 10) / 10;
  await User.findByIdAndUpdate(userId, { averageRating: avg });
  return avg;
};

const writeReview = async (req, res, next) => {
  try {
    const { subjectId, rideId, rating, content = '' } = req.body;

    if (subjectId === req.user._id.toString()) {
      return error(res, 400, 'You cannot review yourself.');
    }

    const [authorBooking, subjectBooking] = await Promise.all([
      Booking.findOne({ rideId, passengerId: req.user._id, status: 'Completed' }),
      Booking.findOne({ rideId, passengerId: subjectId, status: 'Completed' }),
    ]);

    const { Ride } = require('../models');
    const ride = await Ride.findById(rideId);
    if (!ride || ride.status !== 'Completed') {
      return error(res, 400, 'Can only review after a completed ride.');
    }

    const authorIsDriver = ride.driverId.toString() === req.user._id.toString();
    const subjectIsDriver = ride.driverId.toString() === subjectId;

    if (!authorIsDriver && !authorBooking) {
      return error(res, 403, 'You must have participated in this ride to leave a review.');
    }
    if (!subjectIsDriver && !subjectBooking) {
      return error(res, 400, 'The person you are reviewing was not on this ride.');
    }

    const existing = await Review.findOne({ authorId: req.user._id, subjectId, rideId });
    if (existing) {
      return error(res, 409, 'You already reviewed this user for this ride.');
    }

    const review = await Review.create({
      authorId: req.user._id, subjectId, rideId, rating, content,
    });

    const newAvg = await recalculateRating(subjectId);

    return success(res, 201, 'Review submitted.', { reviewId: review._id, newAverageRating: newAvg });
  } catch (err) {
    next(err);
  }
};

const modifyReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return error(res, 404, 'Review not found.');

    if (review.authorId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own reviews.');
    }

    if (req.body.rating !== undefined) review.rating = req.body.rating;
    if (req.body.content !== undefined) review.content = req.body.content;
    await review.save();

    await recalculateRating(review.subjectId);

    return success(res, 200, 'Review updated.', { review });
  } catch (err) {
    next(err);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return error(res, 404, 'Review not found.');

    if (review.authorId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only delete your own reviews.');
    }

    const subjectId = review.subjectId;
    await Review.findByIdAndDelete(req.params.reviewId);
    await recalculateRating(subjectId);

    return success(res, 200, 'Review deleted.');
  } catch (err) {
    next(err);
  }
};

const removeInappropriateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return error(res, 404, 'Review not found.');

    const subjectId = review.subjectId;
    await Review.findByIdAndDelete(req.params.reviewId);
    await recalculateRating(subjectId);

    return success(res, 200, 'Review removed by admin.');
  } catch (err) {
    next(err);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    const { sortBy = 'date', order = 'desc' } = req.query;
    const sortField = sortBy === 'rating' ? 'rating' : 'date';
    const sortOrder = order === 'asc' ? 1 : -1;

    const reviews = await Review.find({ subjectId: req.params.userId })
      .populate('authorId', 'firstName lastName profilePicture')
      .populate('rideId', 'departureLocation destination departureDateTime')
      .sort({ [sortField]: sortOrder });

    return success(res, 200, `${reviews.length} review(s).`, { reviews });
  } catch (err) {
    next(err);
  }
};

const getUserRatings = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('averageRating');
    if (!user) return error(res, 404, 'User not found.');

    const totalReviews = await Review.countDocuments({ subjectId: req.params.userId });

    return success(res, 200, 'User ratings retrieved.', { averageRating: user.averageRating, totalReviews });
  } catch (err) {
    next(err);
  }
};

const getReviewSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return error(res, 404, 'User not found.');

    const reviews = await Review.find({ subjectId: req.params.userId });

    if (reviews.length < 10) {
      return success(res, 200, 'Not enough reviews for summary.', {
        summary: null,
        reason: `Need at least 10 reviews, currently have ${reviews.length}.`,
      });
    }

    const positiveKeywords = {
      punctuality: ['on time', 'punctual', 'early'],
      driving: ['calm', 'safe', 'careful', 'smooth'],
      vehicle: ['clean', 'comfortable', 'spacious'],
      communication: ['friendly', 'responsive', 'polite'],
    };

    const negativeKeywords = {
      punctuality: ['late', 'delayed'],
      driving: ['reckless', 'fast', 'aggressive'],
      vehicle: ['dirty', 'cramped', 'small'],
      communication: ['rude', 'unresponsive', 'silent'],
    };

    const positiveCounts = {};
    const negativeCounts = {};

    for (const cat of Object.keys(positiveKeywords)) {
      positiveCounts[cat] = 0;
      negativeCounts[cat] = 0;
    }

    for (const review of reviews) {
      const text = (review.content || '').toLowerCase();
      for (const [cat, words] of Object.entries(positiveKeywords)) {
        if (words.some((w) => text.includes(w))) positiveCounts[cat]++;
      }
      for (const [cat, words] of Object.entries(negativeKeywords)) {
        if (words.some((w) => text.includes(w))) negativeCounts[cat]++;
      }
    }

    const avg = user.averageRating;
    const descriptor = avg >= 4 ? 'highly' : avg >= 3 ? 'favorably' : 'with mixed feedback';

    let summary = `Users rate ${user.firstName} ${descriptor} (${avg}/5).`;

    const topPositive = Object.entries(positiveCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0)
      .slice(0, 2);

    if (topPositive.length > 0) {
      const praise = topPositive.map(([cat]) => cat).join(', ');
      summary += ` Common praise: ${praise}.`;
    }

    const topNegative = Object.entries(negativeCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count >= 2)
      .slice(0, 1);

    if (topNegative.length > 0) {
      summary += ` Some mention: ${topNegative[0][0]} issues.`;
    }

    summary += ` Based on ${reviews.length} reviews.`;

    user.reviewSummary = summary;
    await user.save({ validateModifiedOnly: true });

    return success(res, 200, 'Review summary generated.', { summary });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  writeReview,
  modifyReview,
  deleteReview,
  removeInappropriateReview,
  getUserReviews,
  getUserRatings,
  getReviewSummary,
};