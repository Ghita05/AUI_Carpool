// Review controller — handles creating, editing, and deleting reviews.
// Recalculates averageRating after every write and generates AI summaries via Gemini once a user hits the review threshold.

const { Review, User, Ride } = require('../models');
const { success, error } = require('../utils/responses');

const MIN_REVIEWS_FOR_SUMMARY = 5; // min reviews needed to generate an AI summary
const MIN_DRIVER_RIDES        = 1; // min completed rides to appear in community leaderboard
const MIN_DRIVER_RATING       = 0; // show all rated drivers (sorted by rating)

// Calls Gemini 2.5 Flash to generate a short review summary for a user.
// Returns null on any error so the caller can skip saving it.
async function generateGeminiSummary(userName, role, avgRating, reviews) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not set — skipping AI summary.');
    return null;
  }

  // Build a compact review corpus for the prompt — we only send content, not metadata
  const reviewTexts = reviews
    .filter(r => r.content && r.content.trim().length > 0)
    .map((r, i) => `${i + 1}. "${r.content.trim()}"`)
    .join('\n');

  if (!reviewTexts) return null;

  const prompt = `Based on these ${reviews.length} reviews of ${userName} (a ${role} on a university carpooling platform, avg ${avgRating}/5):

${reviewTexts}

Write 2-3 flowing sentences that capture the overall impression — what kind of ${role} they are, what stands out, and what to expect. Write as a neutral observer who read all the reviews. Third person. No rating numbers. No "reviewers say" or "according to reviews". Complete grammatically correct sentences only. Max 70 words.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
      }
    );
    if (!res.ok) {
      console.warn(`[Gemini] API error ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    console.warn('[Gemini] Request failed:', err.message);
    return null;
  }
}

// Recalculate user's average rating. AI summaries are refreshed by the nightly cron job.
async function recalculateRating(userId) {
  const reviews = await Review.find({ subjectId: userId });
  const avg = reviews.length === 0
    ? 0
    : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  await User.findByIdAndUpdate(userId, { averageRating: avg });
  return avg;
}

const writeReview = async (req, res, next) => {
  try {
    const { subjectId, rideId, rating, content = '' } = req.body;

    if (subjectId === req.user._id.toString()) {
      return error(res, 400, 'You cannot review yourself.');
    }

    const ride = await Ride.findById(rideId);
    if (!ride || ride.state !== 'Completed') {
      return error(res, 400, 'Can only review after a completed ride.');
    }

    const authorIsDriver  = ride.driverId.toString() === req.user._id.toString();
    const subjectIsDriver = ride.driverId.toString() === subjectId;

    const authorBooking = !authorIsDriver
      ? (ride.bookings || []).find(b =>
          b.passengerId.toString() === req.user._id.toString() &&
          ['Confirmed', 'Completed'].includes(b.status)
        )
      : null;

    const subjectBooking = !subjectIsDriver
      ? (ride.bookings || []).find(b =>
          b.passengerId.toString() === subjectId
        )
      : null;

    if (!authorIsDriver && !authorBooking) {
      return error(res, 403, 'You must have participated in this ride to leave a review.');
    }
    if (!subjectIsDriver && !subjectBooking) {
      return error(res, 400, 'The person you are reviewing was not on this ride.');
    }

    const existing = await Review.findOne({ authorId: req.user._id, subjectId, rideId });
    if (existing) return error(res, 409, 'You already reviewed this user for this ride.');

    const review    = await Review.create({ authorId: req.user._id, subjectId, rideId, rating, content });
    const newAvg    = await recalculateRating(subjectId);
    const subject   = await User.findById(subjectId).select('reviewSummary');

    return success(res, 201, 'Review submitted.', {
      reviewId:         review._id,
      newAverageRating: newAvg,
      reviewSummary:    subject?.reviewSummary || null,
    });
  } catch (err) { next(err); }
};

const modifyReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return error(res, 404, 'Review not found.');
    if (review.authorId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own reviews.');
    }
    if (req.body.rating  !== undefined) review.rating  = req.body.rating;
    if (req.body.content !== undefined) review.content = req.body.content;
    await review.save();
    const newAvg = await recalculateRating(review.subjectId);
    return success(res, 200, 'Review updated.', { review, newAverageRating: newAvg });
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
};

// removeInappropriateReview (Admin)
const removeInappropriateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return error(res, 404, 'Review not found.');
    const subjectId = review.subjectId;
    await Review.findByIdAndDelete(req.params.reviewId);
    await recalculateRating(subjectId);
    return success(res, 200, 'Review removed by admin.');
  } catch (err) { next(err); }
};

// getUserReviews
const getUserReviews = async (req, res, next) => {
  try {
    const { sortBy = 'date', order = 'desc', type } = req.query;
    const sortField = sortBy === 'rating' ? 'rating' : 'date';
    const sortOrder = order === 'asc' ? 1 : -1;

    // type=given → reviews the user wrote; type=received (default) → reviews about the user
    const filter = type === 'given'
      ? { authorId:  req.params.userId }
      : { subjectId: req.params.userId };

    const reviews = await Review.find(filter)
      .populate('authorId',  'firstName lastName profilePicture')
      .populate('subjectId', 'firstName lastName profilePicture')
      .populate('rideId',    'departureLocation destination departureDateTime driverId')
      .sort({ [sortField]: sortOrder });

    // Attach subjectRole — was the reviewed person the driver or a passenger on that ride?
    const enriched = reviews.map(r => {
      const obj = r.toObject();
      if (obj.rideId && obj.subjectId) {
        const subjectStr = (obj.subjectId._id || obj.subjectId).toString();
        const driverStr  = (obj.rideId.driverId || '').toString();
        obj.subjectRole  = subjectStr === driverStr ? 'Driver' : 'Passenger';
      } else {
        obj.subjectRole = null;
      }
      return obj;
    });

    return success(res, 200, `${enriched.length} review(s).`, { reviews: enriched });
  } catch (err) { next(err); }
};

// getUserRatings
const getUserRatings = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('averageRating reviewSummary');
    if (!user) return error(res, 404, 'User not found.');
    const totalReviews = await Review.countDocuments({ subjectId: req.params.userId });
    return success(res, 200, 'Ratings retrieved.', {
      averageRating: user.averageRating,
      totalReviews,
      reviewSummary: user.reviewSummary || null,
    });
  } catch (err) { next(err); }
};

// getReviewSummary — on-demand AI summary regeneration
const getReviewSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return error(res, 404, 'User not found.');

    const reviews = await Review.find({ subjectId: req.params.userId });
    if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) {
      return success(res, 200, 'Not enough reviews for summary.', {
        summary: null,
        needed:  MIN_REVIEWS_FOR_SUMMARY,
        current: reviews.length,
      });
    }

    const name    = `${user.firstName} ${user.lastName}`.trim();
    const summary = await generateGeminiSummary(name, user.role, user.averageRating, reviews);

    if (summary) {
      await User.findByIdAndUpdate(req.params.userId, { reviewSummary: summary });
    }

    return success(res, 200, 'Summary generated.', { summary: summary || user.reviewSummary || null });
  } catch (err) { next(err); }
};

// getCommunity
// GET /api/reviews/community — top-rated verified drivers sorted by rating, with AI summary and frequent routes.
const getCommunity = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const drivers = await User.find({
      role:               'Driver',
      accountStatus:      'Active',
      totalCompletedRides:{ $gte: MIN_DRIVER_RIDES },
    })
      .select('firstName lastName profilePicture averageRating totalCompletedRides reviewSummary drivingStyle smokingPreference')
      .sort({ averageRating: -1, totalCompletedRides: -1 })
      .limit(Number(limit));

    // For each driver, compute driver-only rating and attach top route
    const enriched = await Promise.all(drivers.map(async (driver) => {
      // Driver-only rating: only reviews where this user was the driver of the ride
      const driverRideIds = await Ride.find(
        { type: 'Offer', state: 'Completed', driverId: driver._id },
        { _id: 1 },
      ).lean();
      const rideIds = driverRideIds.map(r => r._id);

      let driverRating = 0;
      let driverReviewCount = 0;
      if (rideIds.length > 0) {
        const ratingAgg = await Review.aggregate([
          { $match: { subjectId: driver._id, rideId: { $in: rideIds } } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        if (ratingAgg.length > 0) {
          driverRating = Math.round(ratingAgg[0].avg * 10) / 10;
          driverReviewCount = ratingAgg[0].count;
        }
      }

      const topRoutes = await Ride.aggregate([
        {
          $match: {
            type:     'Offer',
            state:    'Completed',
            driverId: driver._id,
          },
        },
        {
          $group: {
            _id:          { from: '$departureLocation', to: '$destination' },
            count:        { $sum: 1 },
            avgPrice:     { $avg: '$pricePerSeat' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);

      return {
        ...driver.toObject(),
        averageRating: driverRating,
        driverReviewCount,
        topRoute: topRoutes[0]
          ? {
              from:     topRoutes[0]._id.from,
              to:       topRoutes[0]._id.to,
              count:    topRoutes[0].count,
              avgPrice: Math.round(topRoutes[0].avgPrice),
            }
          : null,
      };
    }));

    // Re-sort by driver-only rating (the DB sort used the global averageRating)
    enriched.sort((a, b) => b.averageRating - a.averageRating || b.totalCompletedRides - a.totalCompletedRides);

    return success(res, 200, `${enriched.length} driver(s) in community.`, { drivers: enriched });
  } catch (err) { next(err); }
};

// getDriverAnalytics
// GET /api/reviews/driver/:userId/analytics — top 5 most frequent routes with trip count, avg price, and latest date.
const getDriverAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('role totalCompletedRides averageRating');
    if (!user) return error(res, 404, 'User not found.');
    if (user.role !== 'Driver') return error(res, 400, 'Analytics are only available for drivers.');

    const routeStats = await Ride.aggregate([
      {
        $match: {
          type:     'Offer',
          state:    'Completed',
          driverId: user._id,
        },
      },
      {
        $group: {
          _id:         { from: '$departureLocation', to: '$destination' },
          count:       { $sum: 1 },
          avgPrice:    { $avg: '$pricePerSeat' },
          lastDate:    { $max: '$departureDateTime' },
          totalEarned: { $sum: { $multiply: ['$pricePerSeat', { $subtract: ['$totalSeats', '$availableSeats'] }] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id:         0,
          from:        '$_id.from',
          to:          '$_id.to',
          count:       1,
          avgPrice:    { $round: ['$avgPrice', 0] },
          lastDate:    1,
          totalEarned: { $round: ['$totalEarned', 0] },
        },
      },
    ]);

    // Overall stats
    const overall = await Ride.aggregate([
      { $match: { type: 'Offer', state: 'Completed', driverId: user._id } },
      {
        $group: {
          _id:            null,
          totalPassengers:{ $sum: { $subtract: ['$totalSeats', '$availableSeats'] } },
          totalEarned:    { $sum: { $multiply: ['$pricePerSeat', { $subtract: ['$totalSeats', '$availableSeats'] }] } },
          uniqueDests:    { $addToSet: '$destination' },
        },
      },
    ]);

    const stats = overall[0] || {};

    return success(res, 200, 'Driver analytics retrieved.', {
      routes:          routeStats,
      totalRides:      user.totalCompletedRides,
      averageRating:   user.averageRating,
      totalPassengers: stats.totalPassengers || 0,
      totalEarned:     Math.round(stats.totalEarned || 0),
      uniqueDestCount: (stats.uniqueDests || []).length,
    });
  } catch (err) { next(err); }
};

module.exports = {
  writeReview,
  modifyReview,
  deleteReview,
  removeInappropriateReview,
  getUserReviews,
  getUserRatings,
  getReviewSummary,
  getCommunity,
  getDriverAnalytics,
};
