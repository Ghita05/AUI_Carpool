Change 1 — Unified Ride Model
What to do
Delete models/Booking.js and models/RideRequest.js. Rewrite models/Ride.js as a single unified document that covers all three lifecycle states using a type field (Offer or Request) and an embedded bookings array.
Exact new schema for models/Ride.js
jsconst mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Waypoint sub-document (inner city model) ──────────────────────────────
// Represents one stop in the computed driving sequence.
// Order field determines the sequence the driver follows.
const waypointSchema = new Schema({
  order:       { type: Number, required: true },
  passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['pickup', 'dropoff'], required: true },
  location:    { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
}, { _id: false });

// ── Route sub-document ────────────────────────────────────────────────────
const routeSchema = new Schema({
  originLatitude:       { type: Number },
  originLongitude:      { type: Number },
  destinationLatitude:  { type: Number },
  destinationLongitude: { type: Number },
  distanceKM:           { type: Number },
  durationMinutes:      { type: Number },
  polyline:             { type: String, default: null },
  waypoints:            { type: [waypointSchema], default: [] },
}, { _id: false });

// ── Booking sub-document (embedded in Offer documents) ───────────────────
const bookingSubSchema = new Schema({
  passengerId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:            { type: Schema.Types.ObjectId, default: null },
  status:             {
    type: String,
    enum: ['Confirmed', 'Cancelled', 'Completed'],
    default: 'Confirmed',
  },
  pickupLocation:     { type: String, default: '' },
  pickupCoords:       {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  dropoffLocation:    { type: String, default: null },
  dropoffCoords:      {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  luggageDeclaration: { type: String, default: '' },
  price:              { type: Number, default: 0 },
  attendanceStatus:   {
    type: String,
    enum: ['Present', 'Absent'],
    default: null,
  },
  cancellationReason: { type: String, default: null },
  cancellationDate:   { type: Date, default: null },
  report: {
    category:    { type: String, default: null },
    description: { type: String, default: null },
    status:      {
      type: String,
      enum: ['Open', 'Resolved', 'Closed'],
      default: null,
    },
    adminNote:   { type: String, default: null },
    createdAt:   { type: Date, default: null },
    resolvedAt:  { type: Date, default: null },
  },
  bookedAt: { type: Date, default: Date.now },
}, { _id: true, timestamps: false });

// ── Unified Ride schema ───────────────────────────────────────────────────
const rideSchema = new Schema({

  // Lifecycle discriminator — drives which fields are meaningful
  type: {
    type: String,
    enum: ['Offer', 'Request'],
    required: [true, 'Ride type is required'],
  },

  // Unified state enum covering all former status enums
  // Offer states:   Active → Full → Completed | Cancelled
  // Request states: Open → Accepted | Expired | Cancelled
  state: {
    type: String,
    enum: ['Open', 'Active', 'Full', 'Accepted', 'Completed', 'Cancelled', 'Expired'],
    default: null, // set in pre-save hook based on type
  },

  rideScope: {
    type: String,
    enum: ['Intercity', 'InnerCity'],
    default: 'InnerCity',
  },

  // ── Shared fields ─────────────────────────────────────────────────────
  departureLocation: { type: String, required: true, trim: true },
  destination:       { type: String, required: true, trim: true },
  departureDateTime: { type: Date, required: true },
  pricePerSeat:      { type: Number, required: true, min: 0 },
  genderPreference:  {
    type: String,
    enum: ['Women-Only', 'All'],
    default: 'All',
  },
  notes: { type: String, default: '' },

  // ── Offer-only fields ─────────────────────────────────────────────────
  driverId:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
  vehicleId:       { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  totalSeats:      { type: Number, min: 1, default: null },
  availableSeats:  { type: Number, min: 0, default: null },
  timeChangeCount: { type: Number, default: 0 },
  route:           { type: routeSchema, default: null },
  bookings:        { type: [bookingSubSchema], default: [] },

  // ── Request-only fields ───────────────────────────────────────────────
  passengerId:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  groupPassengerIds: { type: [Schema.Types.ObjectId], default: [] },
  leftMembers:       { type: Map, of: Number, default: {} },
  passengerCount:    { type: Number, min: 1, default: null },
  maxPrice:          { type: Number, default: null },
  acceptedRideId:    { type: Schema.Types.ObjectId, ref: 'Ride', default: null },

  // ── Cancellation (both types) ─────────────────────────────────────────
  cancellationReason: { type: String, default: null },
  cancellationDate:   { type: Date, default: null },

}, { timestamps: true });

// ── Pre-save: set default state based on type ─────────────────────────────
rideSchema.pre('save', function(next) {
  if (this.isNew && this.state === null) {
    this.state = this.type === 'Offer' ? 'Active' : 'Open';
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────
rideSchema.index({ type: 1, state: 1, departureDateTime: 1 });
rideSchema.index({ driverId: 1, type: 1 });
rideSchema.index({ passengerId: 1, type: 1 });
rideSchema.index({ 'bookings.passengerId': 1 });
rideSchema.index({ 'bookings._id': 1 });
rideSchema.index({ destination: 'text', departureLocation: 'text' });
rideSchema.index({ rideScope: 1, state: 1, departureDateTime: 1 });
rideSchema.index({ pricePerSeat: 1 });
rideSchema.index({ availableSeats: -1 });

module.exports = mongoose.model('Ride', rideSchema);
Update models/index.js
Remove all imports of Booking and RideRequest. Export only Ride (and the other models: User, Vehicle, Review, Notification, Message).
jsconst Ride         = require('./Ride');
const User         = require('./User');
const Vehicle      = require('./Vehicle');
const Review       = require('./Review');
const Notification = require('./Notification');
const Message      = require('./Message');

module.exports = { Ride, User, Vehicle, Review, Notification, Message };

Change 2 — Rewrite bookingController.js
All booking operations now use $push, $set, $pull, and $elemMatch on the unified Ride document. There is no longer a separate Booking model.
Key operation patterns
Finding a booking by its _id:
jsconst ride = await Ride.findOne(
  { 'bookings._id': bookingId },
  { 'bookings.$': 1, driverId: 1, destination: 1, departureDateTime: 1,
    availableSeats: 1, state: 1, rideScope: 1, route: 1 }
);
const booking = ride?.bookings?.[0];
Finding all bookings for a passenger (current):
jsconst rides = await Ride.find(
  { type: 'Offer', 'bookings.passengerId': userId,
    'bookings.status': { $in: ['Confirmed'] } }
).populate('driverId', 'firstName lastName averageRating profilePicture')
 .populate('vehicleId', 'brand model color sizeCategory');
// then map each ride to its matching booking sub-document
Booking history (all statuses):
jsconst rides = await Ride.find(
  { type: 'Offer', 'bookings.passengerId': userId }
);
Creating a booking (bookRide):
js// 1. Validate ride: type=Offer, state=Active, availableSeats>=1, gender match
// 2. Check no existing Confirmed booking: ride.bookings.some(b => b.passengerId.equals(userId) && b.status === 'Confirmed')
// 3. Call routeService.validateStop() for inner city
// 4. Call routeService.recomputeWaypoints() for inner city
// 5. Push booking and decrement seats atomically:
const newBooking = {
  passengerId: userId,
  pickupLocation,
  pickupCoords,      // inner city only
  dropoffLocation,   // inner city only
  dropoffCoords,     // inner city only
  luggageDeclaration,
  price: ride.pricePerSeat,
  status: 'Confirmed',
};
await Ride.findByIdAndUpdate(rideId, {
  $push: { bookings: newBooking },
  $inc:  { availableSeats: -1 },
});
// 6. If availableSeats reaches 0, set state: 'Full'
await Ride.findByIdAndUpdate(rideId,
  { $set: { state: 'Full' } },
  { condition: { availableSeats: 0 } }
);
// (or check after the $inc and do a second update)
Cancelling a booking:
jsawait Ride.findOneAndUpdate(
  { 'bookings._id': bookingId },
  {
    $set: {
      'bookings.$.status': 'Cancelled',
      'bookings.$.cancellationReason': reason,
      'bookings.$.cancellationDate': new Date(),
    },
    $inc: { availableSeats: 1 },
  }
);
Updating attendance:
jsawait Ride.findOneAndUpdate(
  { 'bookings._id': bookingId },
  { $set: { 'bookings.$.attendanceStatus': status } }
);
Getting passenger list (driver view):
jsconst ride = await Ride.findById(rideId)
  .select('bookings driverId')
  .populate('bookings.passengerId', 'firstName lastName phoneNumber profilePicture');
const passengers = ride.bookings.filter(b => b.status === 'Confirmed');
Filing a report on a booking:
jsawait Ride.findOneAndUpdate(
  { 'bookings._id': bookingId },
  {
    $set: {
      'bookings.$.report.category':    category,
      'bookings.$.report.description': description,
      'bookings.$.report.status':      'Open',
      'bookings.$.report.createdAt':   new Date(),
    }
  }
);
Completing all bookings (after ride completes):
jsawait Ride.findByIdAndUpdate(rideId, {
  $set: { 'bookings.$[elem].status': 'Completed' },
}, {
  arrayFilters: [{ 'elem.status': 'Confirmed' }],
  multi: true,
});
Import change at top of bookingController.js
jsconst { Ride, Notification, User, Message } = require('../models');
// Remove: Booking import

Change 3 — Rewrite rideRequestController.js
All queries that used RideRequest.find(...) now use Ride.find({ type: 'Request', ... }). All creates that used RideRequest.create(...) now use Ride.create({ type: 'Request', state: 'Open', ... }).
Key mappings
OldNewRideRequest.create({...})Ride.create({ type: 'Request', state: 'Open', ...fields })RideRequest.find({ passengerId })Ride.find({ type: 'Request', passengerId })RideRequest.find({ status: 'Open' })Ride.find({ type: 'Request', state: 'Open' })request.status = 'Accepted'ride.state = 'Accepted'request.acceptedRideId = rideIdride.acceptedRideId = rideIdRideRequest.findById(id)Ride.findOne({ _id: id, type: 'Request' })request.status = 'Cancelled'ride.state = 'Cancelled'Field travelDateTimeSame field name, kept as-isField statusRenamed to state
acceptRideRequest — full rewrite
When a driver accepts a request, the function must:

Find the request: Ride.findOne({ _id: requestId, type: 'Request', state: 'Open' })
Create a new Offer ride from the request data:

jsconst newOffer = await Ride.create({
  type: 'Offer',
  state: 'Active',
  rideScope: 'InnerCity',
  driverId: req.user._id,
  vehicleId: req.body.vehicleId, // driver must provide which vehicle
  departureLocation: request.departureLocation,
  destination: request.destination,
  departureDateTime: request.travelDateTime,
  pricePerSeat: request.maxPrice,
  totalSeats: request.passengerCount,
  availableSeats: request.passengerCount,
  genderPreference: request.genderPreference || 'All',
  notes: request.notes,
});

Create embedded bookings for each passenger in the group:

jsconst passengerIds = [request.passengerId, ...request.groupPassengerIds];
const bookingDocs = passengerIds.map(pid => ({
  passengerId: pid,
  status: 'Confirmed',
  price: request.maxPrice,
}));
await Ride.findByIdAndUpdate(newOffer._id, {
  $push: { bookings: { $each: bookingDocs } },
  $inc:  { availableSeats: -passengerIds.length },
});

Update the request: Ride.findByIdAndUpdate(requestId, { $set: { state: 'Accepted', acceptedRideId: newOffer._id } })
Send notifications to all passengers.

Import change at top of rideRequestController.js
jsconst { Ride, Notification, User } = require('../models');
// Remove: RideRequest import

Change 4 — Update rideController.js
getAvailableRides — add rideScope filter and recommender
Add rideScope to the filter construction:
jsconst { destination, departureLocation, date, rideScope,
        sortBy = 'departureDateTime', order = 'asc',
        minPrice, maxPrice, genderPreference, page = 1, limit = 20 } = req.query;

const filter = {
  type: 'Offer',
  state: { $in: ['Active', 'Full'] },
  departureDateTime: { $gte: new Date() },
};

if (rideScope) filter.rideScope = rideScope;
if (destination) filter.destination = { $regex: destination, $options: 'i' };
// ... rest of filter construction unchanged
After fetching rides, apply recommender scoring:
jsconst { scoreRides } = require('../utils/recommender');

// Fetch user history in parallel with rides query
const [rides, userHistory] = await Promise.all([
  Ride.find(filter)
    .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture')
    .populate('vehicleId', 'brand model color sizeCategory luggageCapacity licensePlate smokingPolicy')
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(Number(limit)),
  Ride.find(
    { type: 'Offer', state: 'Completed', 'bookings.passengerId': req.user._id },
    { destination: 1, departureDateTime: 1, pricePerSeat: 1 }
  ).limit(30),
]);

const scored = scoreRides(rides, userHistory, req.user);
scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

return success(res, 200, `${scored.length} ride(s) found.`, {
  rides: scored,
  pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
});
All other rideController functions
Replace every reference to status field with state. Replace every filter { status: 'Active' } with { state: 'Active' }. Add type: 'Offer' to every query that targets ride offers. No other logic changes.

Change 5 — Create utils/recommender.js (new file)
js/**
 * utils/recommender.js
 * Content-based weighted scoring for ride recommendations.
 * Pure function — no database calls, no side effects.
 * Called by rideController.getAvailableRides() after fetching rides.
 */

const WEIGHTS = {
  DESTINATION: 0.40,
  PREFERENCE:  0.25,
  TIME_PATTERN:0.15,
  DRIVER_RATING:0.10,
  PRICE_FIT:   0.10,
};

/**
 * scoreRides
 * @param {Array}  rides       - Array of Mongoose Ride documents (Offers)
 * @param {Array}  history     - Array of past completed rides the user booked
 * @param {Object} user        - The requesting user document
 * @returns {Array}            - Same rides array with .recommendationScore added
 */
function scoreRides(rides, history, user) {
  const historyCount = history.length;

  // ── Build destination frequency map from history ─────────────────────────
  const destFreq = {};
  let totalTrips = 0;
  for (const h of history) {
    const d = h.destination?.toLowerCase();
    if (d) { destFreq[d] = (destFreq[d] || 0) + 1; totalTrips++; }
  }

  // ── Build time pattern from history ──────────────────────────────────────
  // dayHourCounts[dayOfWeek][hour] = count
  const dayHourCounts = {};
  for (const h of history) {
    const dt = new Date(h.departureDateTime);
    const key = `${dt.getDay()}_${dt.getHours()}`;
    dayHourCounts[key] = (dayHourCounts[key] || 0) + 1;
  }
  const maxDayHour = Math.max(1, ...Object.values(dayHourCounts));

  // ── Build median price from history ──────────────────────────────────────
  const prices = history.map(h => h.pricePerSeat).filter(Boolean).sort((a,b)=>a-b);
  const medianPrice = prices.length
    ? prices[Math.floor(prices.length / 2)]
    : null;

  // ── Determine scoring tier based on history volume ────────────────────────
  // Tier 1: 0 bookings     → only preference + departure time
  // Tier 2: 1-4 bookings   → preference + destination + rating
  // Tier 3: 5+ bookings    → full five-feature scoring
  const tier = historyCount === 0 ? 1 : historyCount < 5 ? 2 : 3;

  return rides.map(ride => {
    let score = 0;

    if (tier === 1) {
      // No history — score purely on preference match
      // Rides are then sorted by departure time (handled in controller)
      score = scorePreference(ride, user) * 0.60 + scoreDriverRating(ride) * 0.40;

    } else if (tier === 2) {
      score =
        scoreDestination(ride, destFreq, totalTrips) * 0.45 +
        scorePreference(ride, user)                  * 0.35 +
        scoreDriverRating(ride)                      * 0.20;

    } else {
      score =
        scoreDestination(ride, destFreq, totalTrips) * WEIGHTS.DESTINATION +
        scorePreference(ride, user)                  * WEIGHTS.PREFERENCE  +
        scoreTimePattern(ride, dayHourCounts, maxDayHour) * WEIGHTS.TIME_PATTERN +
        scoreDriverRating(ride)                      * WEIGHTS.DRIVER_RATING +
        scorePriceFit(ride, medianPrice)             * WEIGHTS.PRICE_FIT;
    }

    ride._doc = ride._doc || {};
    ride.recommendationScore = parseFloat(score.toFixed(4));
    return ride;
  });
}

// ── Individual scoring functions ──────────────────────────────────────────

function scoreDestination(ride, destFreq, totalTrips) {
  if (totalTrips === 0) return 0;
  const key = ride.destination?.toLowerCase();
  const freq = destFreq[key] || 0;
  return freq / totalTrips; // proportion of trips to this destination
}

function scorePreference(ride, user) {
  let score = 0;
  let checks = 0;

  // Smoking preference
  if (ride.vehicleId?.smokingPolicy && user.smokingPreference) {
    checks++;
    const rideAllows = ride.vehicleId.smokingPolicy === 'Allowed';
    const userWants  = user.smokingPreference === 'Smoker';
    if (rideAllows === userWants || (!rideAllows && !userWants)) score++;
  }

  // Gender preference — compatible if ride is All, or ride matches user gender
  if (ride.genderPreference) {
    checks++;
    if (ride.genderPreference === 'All') score++;
    else if (ride.genderPreference === 'Women-Only' && user.gender === 'Female') score++;
  }

  return checks === 0 ? 0.5 : score / checks; // 0.5 if no preference data
}

function scoreTimePattern(ride, dayHourCounts, maxDayHour) {
  const dt = new Date(ride.departureDateTime);
  const key = `${dt.getDay()}_${dt.getHours()}`;
  const count = dayHourCounts[key] || 0;
  return count / maxDayHour;
}

function scoreDriverRating(ride) {
  const rating = ride.driverId?.averageRating;
  if (!rating) return 0.5; // unknown driver — neutral score
  return rating / 5.0;
}

function scorePriceFit(ride, medianPrice) {
  if (!medianPrice) return 0.5; // no price history — neutral
  const price = ride.pricePerSeat;
  if (price <= medianPrice) return 1.0;
  if (price >= medianPrice * 2) return 0.0;
  // Linear decay from medianPrice to 2×medianPrice
  return 1.0 - ((price - medianPrice) / medianPrice);
}

module.exports = { scoreRides };

Change 6 — Create services/routeService.js (new file)
js/**
 * services/routeService.js
 * All geographic computation for the Routes & Locations building block.
 * Owns: route computation, stop validation, waypoint reordering, location sharing.
 * Data lives on the Ride document — this service reads and writes ride.route.
 */

const { getDirections, isStopOnRoute } = require('../utils/maps');
const { Ride } = require('../models');

// Detour thresholds per ride scope
const DETOUR_THRESHOLD = { InnerCity: 0.5, Intercity: 3.0 };

/**
 * computeRoute
 * Called by rideController.postRideOffer() after creating the ride.
 * Returns structured route data to embed in ride.route.
 */
async function computeRoute(departureLocation, destination, stops = []) {
  const directions = await getDirections(departureLocation, destination, stops);
  return {
    originLatitude:       directions.originLat,
    originLongitude:      directions.originLng,
    destinationLatitude:  directions.destLat,
    destinationLongitude: directions.destLng,
    distanceKM:           directions.distanceKM,
    durationMinutes:      directions.durationMinutes,
    polyline:             directions.polyline,
    waypoints:            [],
  };
}

/**
 * validateStop
 * Called by bookingController.bookRide() before creating a booking.
 * Returns { onRoute, deviationKM } — throws if API fails (fail open in caller).
 */
async function validateStop(origin, destination, stopLocation, rideScope = 'InnerCity') {
  const threshold = DETOUR_THRESHOLD[rideScope] ?? 0.5;
  const result = await isStopOnRoute(origin, destination, stopLocation);
  return {
    onRoute: result.deviationKM <= threshold,
    deviationKM: result.deviationKM,
    threshold,
  };
}

/**
 * recomputeWaypoints
 * Called by bookingController.bookRide() after booking validation passes (inner city).
 * Fetches all confirmed bookings, adds the new pickup+dropoff, reorders, calls Directions.
 * Updates ride.route in place and returns the updated route object.
 */
async function recomputeWaypoints(rideId, newPickupCoords, newDropoffCoords, newPassengerId, pickupLocation, dropoffLocation) {
  const ride = await Ride.findById(rideId).select('route bookings departureLocation destination rideScope');
  if (!ride) throw new Error('Ride not found for waypoint recomputation');

  // Build full waypoint list: existing confirmed bookings + new passenger
  const confirmedBookings = ride.bookings.filter(b => b.status === 'Confirmed');

  const allPickups = [
    // Existing passenger pickups
    ...confirmedBookings
      .filter(b => b.pickupCoords?.lat)
      .map(b => ({
        passengerId: b.passengerId,
        type: 'pickup',
        location: b.pickupLocation,
        coords: b.pickupCoords,
      })),
    // New passenger pickup
    {
      passengerId: newPassengerId,
      type: 'pickup',
      location: pickupLocation,
      coords: newPickupCoords,
    },
  ];

  const allDropoffs = [
    // Existing passenger dropoffs
    ...confirmedBookings
      .filter(b => b.dropoffCoords?.lat)
      .map(b => ({
        passengerId: b.passengerId,
        type: 'dropoff',
        location: b.dropoffLocation,
        coords: b.dropoffCoords,
      })),
    // New passenger dropoff
    {
      passengerId: newPassengerId,
      type: 'dropoff',
      location: dropoffLocation || ride.destination,
      coords: newDropoffCoords || {
        lat: ride.route?.destinationLatitude,
        lng: ride.route?.destinationLongitude,
      },
    },
  ];

  // Build waypoints string array for Directions API: [pickup1, pickup2, ..., dropoff1, dropoff2]
  // Simple ordering: all pickups first, then all dropoffs.
  // For a production system this would use TSP optimisation — sufficient for capstone scope.
  const waypointStrings = [
    ...allPickups.map(p => `${p.coords.lat},${p.coords.lng}`),
    ...allDropoffs.map(d => `${d.coords.lat},${d.coords.lng}`),
  ];

  // Call Directions API with full sequence
  const directions = await getDirections(
    ride.departureLocation,
    ride.destination,
    waypointStrings
  );

  // Build ordered waypoint sub-documents
  const orderedWaypoints = [
    ...allPickups.map((p, i) => ({
      order: i,
      passengerId: p.passengerId,
      type: 'pickup',
      location: p.location,
      coordinates: p.coords,
    })),
    ...allDropoffs.map((d, i) => ({
      order: allPickups.length + i,
      passengerId: d.passengerId,
      type: 'dropoff',
      location: d.location,
      coordinates: d.coords,
    })),
  ];

  // Update the ride's route sub-document
  const updatedRoute = {
    ...ride.route.toObject(),
    distanceKM: directions.distanceKM,
    durationMinutes: directions.durationMinutes,
    polyline: directions.polyline,
    waypoints: orderedWaypoints,
  };

  await Ride.findByIdAndUpdate(rideId, {
    $set: { route: updatedRoute },
  });

  return updatedRoute;
}

/**
 * shareLocation
 * Emits the driver's live coordinates to all passengers via Socket.IO.
 * No database write — pure real-time event.
 */
function shareLocation(io, rideId, driverId, lat, lng) {
  io.to(`ride:${rideId}`).emit('driver-location', {
    rideId,
    driverId,
    coordinates: { lat, lng },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { computeRoute, validateStop, recomputeWaypoints, shareLocation };

Change 7 — Create routes/routeRoutes.js (new file)
jsconst express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Ride } = require('../models');
const { success, error } = require('../utils/responses');
const routeService = require('../services/routeService');

// GET /api/routes/:rideId
// Returns the route sub-document + waypoints for a given offer ride
router.get('/:rideId', authenticate, async (req, res, next) => {
  try {
    const ride = await Ride.findOne(
      { _id: req.params.rideId, type: 'Offer' },
      { route: 1, departureLocation: 1, destination: 1, rideScope: 1 }
    );
    if (!ride) return error(res, 404, 'Ride not found.');
    return success(res, 200, 'Route retrieved.', { route: ride.route });
  } catch (err) { next(err); }
});

// POST /api/routes/validate-stop
// Validates that a stop location is within the detour threshold for the ride's scope
// Body: { rideId, stopLocation, stopCoords: {lat, lng}, stopType: 'pickup'|'dropoff' }
router.post('/validate-stop', authenticate, async (req, res, next) => {
  try {
    const { rideId, stopLocation, stopType } = req.body;
    const ride = await Ride.findOne(
      { _id: rideId, type: 'Offer' },
      { departureLocation: 1, destination: 1, rideScope: 1 }
    );
    if (!ride) return error(res, 404, 'Ride not found.');

    const result = await routeService.validateStop(
      ride.departureLocation,
      ride.destination,
      stopLocation,
      ride.rideScope
    );

    return success(res, 200, result.onRoute ? 'Stop is on route.' : 'Stop is off route.', result);
  } catch (err) { next(err); }
});

// PUT /api/routes/:rideId/location
// Driver shares live location — emits via Socket.IO, no DB write
router.put('/:rideId/location', authenticate, authorize('Driver'), async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return error(res, 400, 'Coordinates required.');
    const io = req.app.get('io');
    routeService.shareLocation(io, req.params.rideId, req.user._id, lat, lng);
    return success(res, 200, 'Location shared.');
  } catch (err) { next(err); }
});

module.exports = router;
Register in server.js
Find where existing routes are registered and add:
jsconst routeRoutes = require('./routes/routeRoutes');
app.use('/api/routes', routeRoutes);
Also make sure io is accessible on req.app:
js// After creating the io instance:
app.set('io', io);

Change 8 — Update bookingController.js for inner city booking
In bookRide(), after the ride validation checks and before creating the booking, add the route validation block for inner city rides:
js// ── Inner city stop validation ─────────────────────────────────────────────
if (ride.rideScope === 'InnerCity') {
  const { pickupLocation, pickupCoords, dropoffLocation, dropoffCoords } = req.body;

  if (!pickupCoords?.lat || !pickupCoords?.lng) {
    return error(res, 400, 'Pickup coordinates are required for inner city rides.');
  }

  const routeService = require('../services/routeService');

  // Validate pickup
  try {
    const pickupCheck = await routeService.validateStop(
      ride.departureLocation, ride.destination,
      `${pickupCoords.lat},${pickupCoords.lng}`,
      'InnerCity'
    );
    if (!pickupCheck.onRoute) {
      return error(res, 400,
        `Pickup point adds ${pickupCheck.deviationKM} km detour. Maximum allowed is ${pickupCheck.threshold} km for inner city rides.`
      );
    }
  } catch (mapsErr) {
    console.warn('[bookRide] Pickup validation failed, proceeding:', mapsErr.message);
  }

  // Validate dropoff (only if different from ride destination)
  if (dropoffCoords?.lat && dropoffCoords?.lng) {
    try {
      const dropoffCheck = await routeService.validateStop(
        ride.departureLocation, ride.destination,
        `${dropoffCoords.lat},${dropoffCoords.lng}`,
        'InnerCity'
      );
      if (!dropoffCheck.onRoute) {
        return error(res, 400,
          `Dropoff point adds ${dropoffCheck.deviationKM} km detour. Maximum allowed is ${dropoffCheck.threshold} km for inner city rides.`
        );
      }
    } catch (mapsErr) {
      console.warn('[bookRide] Dropoff validation failed, proceeding:', mapsErr.message);
    }
  }
}
After the booking is pushed to the ride, add the waypoint recomputation for inner city:
jsif (ride.rideScope === 'InnerCity' && req.body.pickupCoords?.lat) {
  try {
    const routeService = require('../services/routeService');
    await routeService.recomputeWaypoints(
      rideId,
      req.body.pickupCoords,
      req.body.dropoffCoords,
      req.user._id,
      req.body.pickupLocation,
      req.body.dropoffLocation
    );
  } catch (routeErr) {
    console.warn('[bookRide] Waypoint recomputation failed:', routeErr.message);
    // Non-blocking — booking is already created, route update is best-effort
  }
}

Change 9 — Update mobile HomeScreen.js
Replace the current fetch-on-mount pattern with search-first
Find the current useEffect that calls fetchRides() on mount and the current useFocusEffect that silently refetches. Replace both with the following state and handler structure:
js// ── State additions ──────────────────────────────────────────────────────
const [hasSearched, setHasSearched] = useState(false);
const [rideScope, setRideScope] = useState('InnerCity'); // 'InnerCity' | 'Intercity'

// ── Remove the automatic fetch on mount ──────────────────────────────────
// DELETE: useEffect(() => { fetchRides(); }, [fetchRides]);
// DELETE: useFocusEffect(useCallback(() => { fetchRides({}, true); }, [fetchRides]));

// ── New search handler ────────────────────────────────────────────────────
const handleSearch = useCallback(async () => {
  if (!searchText.trim()) return;
  setLoading(true);
  setHasSearched(true);
  try {
    const res = await getAvailableRides({
      ...filters,
      destination: searchText.trim(),
      rideScope,
    });
    setRides(res.data?.rides || []);
  } catch {
    setRides([]);
  } finally {
    setLoading(false);
  }
}, [searchText, filters, rideScope]);

// ── Quick destination chip handler ────────────────────────────────────────
const handleChipSelect = useCallback((destination) => {
  setSearchText(destination);
  setLoading(true);
  setHasSearched(true);
  getAvailableRides({ destination, rideScope })
    .then(res => setRides(res.data?.rides || []))
    .catch(() => setRides([]))
    .finally(() => setLoading(false));
}, [rideScope]);
Replace the bottom sheet render
jsx{/* Bottom Sheet — only shown after a search */}
{hasSearched ? (
  <View style={st.bottomSheet}>
    <View style={st.handle}/>
    <View style={st.sheetHeader}>
      <Text style={st.sheetTitle}>
        {searchText ? `Rides to ${searchText}` : 'Available Rides'}
      </Text>
      <Text style={st.sheetCount}>{rides.length} found</Text>
    </View>
    {loading ? (
      <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 20 }}/>
    ) : rides.length === 0 ? (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: Colors.textSecondary, fontSize: Typography.base, marginBottom: 12 }}>
          No rides found to {searchText}
        </Text>
        <TouchableOpacity
          style={st.postRequestBtn}
          onPress={() => { setRequestDest(searchText); setShowRequest(true); }}
        >
          <Text style={st.postRequestBtnText}>Post a Ride Request instead</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <ScrollView showsVerticalScrollIndicator={false}>
        {rides.map(ride => (
          <RideCard key={ride._id} ride={ride} onPress={() => navigation.navigate('RideDetails', { rideId: ride._id })}/>
        ))}
      </ScrollView>
    )}
  </View>
) : (
  /* Pre-search panel — shown on first open */
  <View style={st.bottomSheet}>
    <View style={st.handle}/>
    <Text style={st.sheetTitle}>Where are you going?</Text>

    {/* Scope toggle */}
    <View style={st.scopeRow}>
      {['InnerCity', 'Intercity'].map(scope => (
        <TouchableOpacity
          key={scope}
          style={[st.scopePill, rideScope === scope && st.scopePillActive]}
          onPress={() => setRideScope(scope)}
        >
          <Text style={[st.scopePillText, rideScope === scope && st.scopePillTextActive]}>
            {scope === 'InnerCity' ? 'Within Ifrane' : 'To another city'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* Quick destination chips */}
    <View style={st.chipRow}>
      {(rideScope === 'InnerCity'
        ? ['Hospital', 'Marché', 'Bus Station', 'Michlifen']
        : ['Fez', 'Meknes', 'Rabat', 'Casablanca']
      ).map(dest => (
        <TouchableOpacity
          key={dest}
          style={st.chip}
          onPress={() => handleChipSelect(dest)}
        >
          <Text style={st.chipText}>{dest}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}
Add these styles to the stylesheet
jsscopeRow:         { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, marginTop: Spacing.sm },
scopePill:        { flex: 1, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
scopePillActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
scopePillText:    { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },
scopePillTextActive: { color: '#fff' },
chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
chip:             { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
chipText:         { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary },
postRequestBtn:   { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
postRequestBtnText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: Typography.sm },
Update the existing handleSearch and handleSearchChange
The existing handleSearch was wired to the search bar submit. Replace its body with a call to the new handleSearch handler above. The handleSearchChange function stays as-is — it updates searchText and highlights pins, unchanged.

Change 10 — Update mobile rideService.js
In getAvailableRides, the function already passes filters as query params. No signature change needed. The rideScope field will be passed as part of the filters object from HomeScreen. No code change required in rideService unless you want to add explicit typing:
js// Already works:
export const getAvailableRides = async (filters = {}) => {
  const { data } = await api.get('/rides', { params: filters });
  return data;
};
// filters can now include { destination, rideScope, maxPrice, ... }
For booking with inner city pickup/dropoff, update bookRide in bookingService.js:
js// Old:
export const bookRide = async (rideId, { pickupLocation, luggageDeclaration }) => {
  const { data } = await api.post(`/rides/${rideId}/bookings`, { pickupLocation, luggageDeclaration });
  return data;
};

// New:
export const bookRide = async (rideId, {
  pickupLocation, pickupCoords,
  dropoffLocation, dropoffCoords,
  luggageDeclaration,
}) => {
  const { data } = await api.post(`/rides/${rideId}/bookings`, {
    pickupLocation, pickupCoords,
    dropoffLocation, dropoffCoords,
    luggageDeclaration,
  });
  return data;
};

Implementation order
Execute in this exact sequence to avoid breaking the running system:

Rewrite models/Ride.js — everything depends on this
Update models/index.js — remove old exports
Rewrite controllers/rideRequestController.js — simplest rewrite, self-contained
Rewrite controllers/bookingController.js — uses new model patterns
Update controllers/rideController.js — add rideScope, add recommender call, fix state references
Create utils/recommender.js — needed by step 5
Create services/routeService.js — needed by step 4
Create routes/routeRoutes.js — needs step 7
Update server.js — register new route, expose io
Update mobile/screens/home/HomeScreen.js — search-first UI
Update mobile/services/bookingService.js — add pickup/dropoff coords


What does NOT change

All existing API route URLs — same endpoints, same HTTP methods
authController, vehicleController, reviewController, messageController, notificationController — no changes
All existing middleware — no changes
Socket.IO setup — no changes (shareLocation uses existing io instance)
JWT token logic — no changes
Multer uploads — no changes
Nodemailer — no changes
Tesseract OCR — no changes
node-cron jobs — no changes
All other mobile screens except HomeScreen and BookRideScreen — no changes