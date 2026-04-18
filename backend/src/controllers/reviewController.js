/**
 * controllers/reviewController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the Manage Ratings & Reviews building block (BB4).
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. Rating recalculation on every write:
 *    averageRating is a computed field on User — updated synchronously after
 *    every review create/update/delete. This keeps the profile screen fast
 *    (no aggregation query needed at read time) and the rating always current.
 *
 * 2. Gemini AI review summary:
 *    Replaces the previous keyword-matching implementation. Gemini produces
 *    a 2-3 sentence natural-language summary from all review texts.
 *    Summary is cached in user.reviewSummary and regenerated whenever a new
 *    review pushes the subject past the MIN_REVIEWS_FOR_SUMMARY threshold,
 *    or on explicit request. Uses gemini-1.5-flash (fast, low-cost, free tier).
 *
 * 3. Community leaderboard:
 *    GET /api/reviews/community — returns top-rated drivers with generated
 *    summaries. This powers the Community button on the HomeScreen map.
 *
 * 4. Driver route analytics:
 *    GET /api/reviews/driver/:userId/analytics — aggregates completed rides
 *    by route and returns frequency + average price. Shown on the driver profile.
 */

const { Review, User, Ride } = require('../models');
const { success, error } = require('../utils/responses');

const MIN_REVIEWS_FOR_SUMMARY = 5; // threshold to generate AI summary (reduced from 10 for capstone demo)
const MIN_DRIVER_RIDES        = 3; // minimum completed rides to appear in community leaderboard
const MIN_DRIVER_RATING       = 3.5;

// ── Gemini helper ─────────────────────────────────────────────────────────────
/**
 * generateGeminiSummary
 * Calls the Gemini 1.5 Flash API to produce a concise user review summary.
 * Returns a plain string. Falls back to null on any error so the caller can
 * skip saving rather than storing a broken summary.
 *
 * WHY gemini-1.5-flash:
 *   Flash is optimised for short, fast tasks. A review summary is exactly that:
 *   low latency, low token count, and the free tier is sufficient for a capstone.
 */
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

  const prompt = `You are summarising reviews for an AUI carpooling platform user named ${userName} who is a ${role}.
Their average rating is ${avgRating}/5 based on ${reviews.length} reviews.

Reviews:
${reviewTexts}

Write a 2-3 sentence summary of what people generally say about this ${role}. 
Be concise, neutral, and specific. Do not use phrases like "users say" or "reviewers mention". 
Write in third person. Do not include the rating number. Max 60 words.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.4 },
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

// ── Rating recalculation (called after every write) ───────────────────────────
async function recalculateRating(userId) {
  const reviews = await Review.find({ subjectId: userId });
  const avg = reviews.length === 0
    ? 0
    : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  await User.findByIdAndUpdate(userId, { averageRating: avg });

  // Regenerate AI summary if threshold met
  if (reviews.length >= MIN_REVIEWS_FOR_SUMMARY) {
    const user = await User.findById(userId).select('firstName lastName role reviewSummary averageRating');
    if (user) {
      const name    = `${user.firstName} ${user.lastName}`.trim();
      const summary = await generateGeminiSummary(name, user.role, avg, reviews);
      if (summary) {
        await User.findByIdAndUpdate(userId, { reviewSummary: summary });
      }
    }
  }

  return avg;
}

// ── writeReview ───────────────────────────────────────────────────────────────
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
          b.passengerId.toString() === subjectId &&
          ['Confirmed', 'Completed'].includes(b.status)
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

// ── modifyReview ──────────────────────────────────────────────────────────────
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

// ── deleteReview ──────────────────────────────────────────────────────────────
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

// ── removeInappropriateReview (Admin) ─────────────────────────────────────────
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

// ── getUserReviews ────────────────────────────────────────────────────────────
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
      .populate('rideId',    'departureLocation destination departureDateTime')
      .sort({ [sortField]: sortOrder });

    return success(res, 200, `${reviews.length} review(s).`, { reviews });
  } catch (err) { next(err); }
};

// ── getUserRatings ────────────────────────────────────────────────────────────
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

// ── getReviewSummary — on-demand AI summary regeneration ─────────────────────
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

// ── getCommunity — top-rated drivers for the Community leaderboard ─────────────
/**
 * GET /api/reviews/community
 * Returns top-rated verified drivers (avg ≥ MIN_DRIVER_RATING, ≥ MIN_DRIVER_RIDES
 * completed) sorted by averageRating descending, with their AI review summary
 * and most frequent routes.
 *
 * This powers the Community button on the HomeScreen map (Figma mockup screen 06).
 */
const getCommunity = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const drivers = await User.find({
      role:               'Driver',
      accountStatus:      'Active',
      verificationStatus: true,
      averageRating:      { $gte: MIN_DRIVER_RATING },
      totalCompletedRides:{ $gte: MIN_DRIVER_RIDES },
    })
      .select('firstName lastName profilePicture averageRating totalCompletedRides reviewSummary drivingStyle smokingPreference')
      .sort({ averageRating: -1, totalCompletedRides: -1 })
      .limit(Number(limit));

    // For each driver, attach their top route (most frequent completed offer)
    const enriched = await Promise.all(drivers.map(async (driver) => {
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

    return success(res, 200, `${enriched.length} driver(s) in community.`, { drivers: enriched });
  } catch (err) { next(err); }
};

// ── getDriverAnalytics — route frequency analytics for a driver's profile ─────
/**
 * GET /api/reviews/driver/:userId/analytics
 * Aggregates completed rides for a driver:
 *   - Top 5 most frequent routes (from → to)
 *   - Per-route: trip count, average price, most recent date
 * Shown on the driver's own profile page (Figma mockup screen 11).
 */
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
