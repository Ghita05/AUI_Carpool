// Ride controller uses the unified Ride model (type: Offer). Bookings are embedded in the ride document.

const { Ride, Notification, User, Message, Review, Route } = require('../models');
const { success, error } = require('../utils/responses');
const { getDirections } = require('../utils/maps');
const { scoreRides } = require('../utils/recommender');
const { emitReviewPrompts } = require('../socket');

// Saves a Route document from raw directions data. Returns the Route _id or null.
async function createRouteDoc(data) {
  if (!data || !data.originLatitude) return null;
  const doc = await Route.create({
    originLatitude:       data.originLatitude,
    originLongitude:      data.originLongitude,
    destinationLatitude:  data.destinationLatitude,
    destinationLongitude: data.destinationLongitude,
    distanceKM:           data.distanceKM,
    durationMinutes:      data.durationMinutes,
    polyline:             data.polyline || null,
    summary:              data.summary || null,
  });
  return doc._id;
}

const postRideOffer = async (req, res, next) => {
  try {
    const {
      vehicleId, departureLocation, destination, stops,
      departureDateTime, totalSeats, pricePerSeat, genderPreference,
      selectedRoute,
    } = req.body;

    const now = new Date();
    const depTime = new Date(departureDateTime);
    if (depTime <= now) return error(res, 400, 'Departure time cannot be in the past.');
    if (depTime - now < 30 * 60 * 1000) return error(res, 400, 'Departure time must be at least 30 minutes from now.');

    let routeData = null;
    if (selectedRoute && selectedRoute.polyline) {
      routeData = {
        originLatitude: selectedRoute.originLat,
        originLongitude: selectedRoute.originLng,
        destinationLatitude: selectedRoute.destLat,
        destinationLongitude: selectedRoute.destLng,
        distanceKM: selectedRoute.distanceKM,
        durationMinutes: selectedRoute.durationMinutes,
        polyline: selectedRoute.polyline,
        summary: selectedRoute.summary || null,
      };
    } else {
      try {
        const directions = await getDirections(departureLocation, destination, stops || []);
        routeData = {
          originLatitude: directions.originLat,
          originLongitude: directions.originLng,
          destinationLatitude: directions.destLat,
          destinationLongitude: directions.destLng,
          distanceKM: directions.distanceKM,
          durationMinutes: directions.durationMinutes,
          polyline: directions.polyline,
        };
      } catch (mapsErr) {
        console.warn('[postRideOffer] Directions API failed, saving without route:', mapsErr.message);
      }
    }

    const routeId = await createRouteDoc(routeData);

    const ride = await Ride.create({
      type: 'Offer',
      state: 'Active',
      driverId: req.user._id,
      vehicleId,
      departureLocation,
      destination,
      departureDateTime,
      totalSeats,
      availableSeats: totalSeats,
      pricePerSeat,
      genderPreference: genderPreference || 'All',
      route: routeId,
      stops: stops || [],
    });

    const populated = await Ride.findById(ride._id)
      .populate('route');

    return success(res, 201, 'Ride offer published.', { rideId: ride._id, ride: populated });
  } catch (err) { next(err); }
};

const modifyRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, type: 'Offer' });
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'You can only modify your own rides.');
    if (['Completed', 'Cancelled'].includes(ride.state)) return error(res, 400, `Cannot modify a ${ride.state.toLowerCase()} ride.`);

    if (req.body.departureDateTime) {
      const now = new Date();
      const newTime = new Date(req.body.departureDateTime);
      const oldTime = new Date(ride.departureDateTime);
      if ((ride.timeChangeCount || 0) >= 10) return error(res, 400, 'Maximum time changes (10) reached for this ride.');
      if (newTime <= now) return error(res, 400, 'Departure time cannot be in the past.');
      if (newTime - now < 30 * 60 * 1000) return error(res, 400, 'Departure time must be at least 30 minutes from now.');
      if (Math.abs(newTime - oldTime) > 24 * 60 * 60 * 1000) return error(res, 400, 'Time can only be changed within ±24 hours of the original departure time.');
    }

    const allowedFields = ['departureLocation', 'destination', 'departureDateTime', 'totalSeats', 'genderPreference'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Gender preference rules
    if (updates.genderPreference) {
      if (updates.genderPreference === 'Women-Only' && req.user.gender !== 'Female') {
        return error(res, 403, 'Only female drivers can set a ride to Women-Only.');
      }
    }

    if (req.body.pricePerSeat !== undefined) return error(res, 400, 'Ride price cannot be edited after creation.');

    if (updates.totalSeats) {
      const bookedSeats = ride.totalSeats - ride.availableSeats;
      const newAvailable = updates.totalSeats - bookedSeats;
      if (newAvailable < 0) return error(res, 400, 'Cannot reduce seats below current bookings.');
      updates.availableSeats = newAvailable;
    }

    if (updates.departureDateTime) updates.timeChangeCount = (ride.timeChangeCount || 0) + 1;

    const routeAffected = updates.departureLocation || updates.destination;
    if (routeAffected) {
      const newDeparture = updates.departureLocation || ride.departureLocation;
      const newDestination = updates.destination || ride.destination;
      try {
        const directions = await getDirections(newDeparture, newDestination, []);
        const newRouteData = {
          originLatitude: directions.originLat,
          originLongitude: directions.originLng,
          destinationLatitude: directions.destLat,
          destinationLongitude: directions.destLng,
          distanceKM: directions.distanceKM,
          durationMinutes: directions.durationMinutes,
          polyline: directions.polyline,
        };
        if (ride.route) {
          await Route.findByIdAndUpdate(ride.route, { $set: newRouteData });
        } else {
          updates.route = await createRouteDoc(newRouteData);
        }
      } catch (mapsErr) {
        console.warn('[modifyRide] Directions API failed, keeping existing route:', mapsErr.message);
      }
    }

    const updatedRide = await Ride.findByIdAndUpdate(req.params.rideId, { $set: updates }, { new: true, runValidators: true })
      .populate('route');

    // Notify all passengers if ride changed from Women-Only to All Genders
    if (updates.genderPreference === 'All' && ride.genderPreference === 'Women-Only') {
      const confirmedBookings = ride.bookings.filter(b => b.status === 'Confirmed');
      const driver = await User.findById(ride.driverId).select('firstName lastName');
      const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'The driver';
      for (const booking of confirmedBookings) {
        await Notification.create({
          userId: booking.passengerId,
          title: 'Ride Opened to All Genders',
          content: `${driverName} has changed your ride to ${ride.destination} on ${new Date(ride.departureDateTime).toLocaleDateString()} from Women-Only to All Genders.`,
          type: 'Alert',
        });
        await Message.create({
          senderId: ride.driverId,
          receiverId: booking.passengerId,
          rideId: ride._id,
          content: `Hi! I've updated our ride to ${ride.destination} on ${new Date(ride.departureDateTime).toLocaleDateString()} — it is now open to all genders (previously Women-Only). Let me know if you have any questions.`,
        });
      }
    }

    return success(res, 200, 'Ride updated.', { ride: updatedRide });
  } catch (err) { next(err); }
};

const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, type: 'Offer' });
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'You can only cancel your own rides.');
    if (['Completed', 'Cancelled'].includes(ride.state)) return error(res, 400, `Cannot cancel a ${ride.state.toLowerCase()} ride.`);

    const now = new Date();
    const departurTime = new Date(ride.departureDateTime);
    if (departurTime - now < 2 * 60 * 60 * 1000) return error(res, 400, 'Cannot cancel a ride within 2 hours of departure.');

    const reason = req.body.reason || 'Ride cancelled by driver';
    const driver = await User.findById(ride.driverId).select('firstName lastName');
    const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();

    // Cancel ride and all confirmed embedded bookings atomically
    const confirmedBookings = ride.bookings.filter(b => b.status === 'Confirmed');

    await Ride.findByIdAndUpdate(ride._id, {
      $set: {
        state: 'Cancelled',
        cancellationReason: req.body.reason || 'Cancelled by driver',
        cancellationDate: new Date(),
        'bookings.$[elem].status': 'Cancelled',
        'bookings.$[elem].cancellationDate': new Date(),
        'bookings.$[elem].cancellationReason': `Ride cancelled by driver: ${reason}`,
      },
    }, {
      arrayFilters: [{ 'elem.status': 'Confirmed' }],
    });

    for (const booking of confirmedBookings) {
      await Message.create({
        senderId: ride.driverId,
        receiverId: booking.passengerId,
        rideId: ride._id,
        content: `Your ride to ${ride.destination} on ${new Date(ride.departureDateTime).toLocaleDateString()} has been cancelled by ${driverName}.\n\nCancellation reason: ${reason}\n\nApologies for any inconvenience.`,
      });

      await Notification.create({
        userId: booking.passengerId,
        title: 'Booking Cancelled',
        content: `Your booking for ${ride.destination} on ${ride.departureDateTime.toLocaleDateString()} has been cancelled by the driver. Reason: ${reason}`,
        type: 'Cancellation',
      });
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { cancellationCount: 1 } });
    return success(res, 200, 'Ride cancelled.', { affectedBookings: confirmedBookings.length });
  } catch (err) { next(err); }
};

const markAttendance = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, type: 'Offer' });
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can mark attendance.');
    if (!['Active', 'Full', 'OnGoing'].includes(ride.state)) return error(res, 400, 'Attendance can only be marked for active or ongoing rides.');

    const now = new Date();
    const depTime = new Date(ride.departureDateTime);
    const thirtyMinBefore = new Date(depTime.getTime() - 30 * 60 * 1000);
    if (now < thirtyMinBefore) {
      return error(res, 400, 'Attendance can only be marked from 30 minutes before departure.');
    }

    const { attendance } = req.body;
    if (!Array.isArray(attendance) || attendance.length === 0) return error(res, 400, 'Attendance array is required.');

    const results = [];
    for (const entry of attendance) {
      const { bookingId, status } = entry;
      if (!['Present', 'Absent'].includes(status)) continue;

      const booking = ride.bookings.id(bookingId);
      if (!booking || booking.status !== 'Confirmed') continue;

      await Ride.findOneAndUpdate(
        { _id: ride._id, 'bookings._id': bookingId },
        { $set: { 'bookings.$.attendanceStatus': status } }
      );

      if (status === 'Absent') {
        await User.findByIdAndUpdate(booking.passengerId, { $inc: { cancellationCount: 1 } });
        await Notification.create({
          userId: booking.passengerId,
          title: 'Marked as No-Show',
          content: `You were marked as absent for the ride to ${ride.destination}. Your cancellation count has been updated.`,
          type: 'Alert',
        });
      }

      results.push({ bookingId, status });
    }

    return success(res, 200, 'Attendance recorded.', { updated: results.length, results });
  } catch (err) { next(err); }
};

const getAttendance = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, type: 'Offer' })
      .populate('bookings.passengerId', 'firstName lastName profilePicture phoneNumber');
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can view attendance.');

    const confirmedBookings = ride.bookings.filter(b => b.status === 'Confirmed');

    const attendanceList = confirmedBookings.map((b) => ({
      bookingId: b._id,
      passenger: b.passengerId,
      pickupLocation: b.pickupLocation,
      attendanceStatus: b.attendanceStatus,
    }));

    return success(res, 200, `${attendanceList.length} passenger(s).`, {
      ride: { _id: ride._id, destination: ride.destination, departureDateTime: ride.departureDateTime, state: ride.state },
      attendance: attendanceList,
      allMarked: attendanceList.every((a) => a.attendanceStatus !== null),
    });
  } catch (err) { next(err); }
};

const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, type: 'Offer' });
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can complete a ride.');
    if (!['Active', 'Full', 'OnGoing'].includes(ride.state)) return error(res, 400, `Cannot complete a ${ride.state?.toLowerCase()} ride.`);

    // Guard: if GPS already completed it, refuse duplicate
    if (ride.reviewsPrompted) {
      return error(res, 400, 'This ride was already completed automatically via GPS.');
    }

    const confirmedBookings = ride.bookings.filter(b => b.status === 'Confirmed');

    // Mark reviewsPrompted = true FIRST (atomic guard against GPS double-fire)
    const completed = await Ride.findOneAndUpdate(
      { _id: ride._id, reviewsPrompted: false },
      {
        $set: {
          state: 'Completed',
          reviewsPrompted: true,
          'bookings.$[elem].status': 'Completed',
        },
      },
      { arrayFilters: [{ 'elem.status': 'Confirmed' }], new: true }
    );
    if (!completed) return error(res, 400, 'Ride was already completed.');

    const presentIds = confirmedBookings
      .filter(b => b.attendanceStatus !== 'Absent')
      .map(b => b.passengerId);

    await User.updateMany(
      { _id: { $in: [ride.driverId, ...presentIds] } },
      { $inc: { totalCompletedRides: 1 } }
    );

    // Emit review prompts via Socket.IO + create in-app notifications
    const io = req.app.get('io');
    if (io) await emitReviewPrompts(io, completed);

    return success(res, 200, 'Ride completed.', {
      completedBookings: confirmedBookings.length,
      presentPassengers: presentIds.length,
    });
  } catch (err) { next(err); }
};
const getAvailableRides = async (req, res, next) => {
  try {
    const {
      destination, departureLocation, date, afterTime,
      sortBy = 'departureDateTime', order = 'asc',
      minPrice, maxPrice, genderPreference, driverId, smokingPolicy,
      page = 1, limit = 20,
    } = req.query;

    const filter = {
      type: 'Offer',
      state: { $in: ['Active', 'Full'] },
      departureDateTime: { $gte: new Date() },
    };

    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (departureLocation) filter.departureLocation = { $regex: departureLocation, $options: 'i' };
    if (driverId) filter.driverId = driverId;
    if (date) {
      const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
      if (afterTime) {
        const [hh, mm] = afterTime.split(':').map(Number);
        if (!isNaN(hh) && !isNaN(mm)) startOfDay.setHours(hh, mm, 0, 0);
      }
      filter.departureDateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (afterTime) {
      // No date but afterTime: filter from today at that time
      const now = new Date();
      const [hh, mm] = afterTime.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (start > now) filter.departureDateTime = { $gte: start };
      }
    }
    if (minPrice || maxPrice) {
      filter.pricePerSeat = {};
      if (minPrice) filter.pricePerSeat.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerSeat.$lte = Number(maxPrice);
    }
    if (genderPreference) filter.genderPreference = genderPreference;

    const sortField = { date: 'departureDateTime', price: 'pricePerSeat', seats: 'availableSeats' }[sortBy] || 'departureDateTime';
    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (Number(page) - 1) * Number(limit);

    const [rides, total, userHistory] = await Promise.all([
      Ride.find(filter)
        .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture')
        .populate('vehicleId', 'brand model color sizeCategory luggageCapacity licensePlate smokingPolicy')
        .populate('route')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Ride.countDocuments(filter),
      Ride.find(
        { type: 'Offer', state: 'Completed', 'bookings.passengerId': req.user._id },
        {
          departureDateTime: 1,
          pricePerSeat:1,
          driverId:1,
          stops:1,
          'bookings.passengerId':1,
          'bookings.status':1,
        }
      ).limit(50),
    ]);

    let scored = scoreRides(rides, userHistory, req.user);

    // Post-filter by vehicle smoking policy (requires populated vehicleId)
    if (smokingPolicy) {
      scored = scored.filter(r => r.vehicleId && r.vehicleId.smokingPolicy === smokingPolicy);
    }

    scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return success(res, 200, `${scored.length} ride(s) found.`, {
      rides: scored,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

const getRideDetails = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture phoneNumber smokingPreference drivingStyle')
      .populate('vehicleId')
      .populate('route');
    if (!ride) return error(res, 404, 'Ride not found.');
    return success(res, 200, 'Ride details retrieved.', { ride });
  } catch (err) { next(err); }
};

const getMyRides = async (req, res, next) => {
  try {
    const { status = 'upcoming' } = req.query;
    const filter = { type: 'Offer', driverId: req.user._id };
    if (status === 'upcoming') {
      filter.state = { $in: ['Active', 'Full', 'OnGoing'] };
      filter.departureDateTime = { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }; // include rides up to 12h past departure (ongoing)
    } else {
      filter.state = { $in: ['Completed', 'Cancelled'] };
    }
    const rides = await Ride.find(filter)
      .populate('vehicleId', 'brand model color')
      .populate('bookings.passengerId', 'firstName lastName')
      .populate('route')
      .sort({ departureDateTime: status === 'upcoming' ? 1 : -1 })
      .lean();

    // For past rides, check if driver has already reviewed
    if (status !== 'upcoming' && rides.length > 0) {
      const rideIds = rides.map(r => r._id);
      const existingReviews = await Review.find({
        authorId: req.user._id,
        rideId: { $in: rideIds },
      }).select('rideId').lean();
      const reviewedRideIds = new Set(existingReviews.map(r => r.rideId.toString()));
      for (const ride of rides) {
        ride.rated = reviewedRideIds.has(ride._id.toString());
      }
    }

    return success(res, 200, `${rides.length} ride(s) found.`, { rides });
  } catch (err) { next(err); }
};

// Haversine distance in km between two lat/lng points.
function haversineKM(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /rides/nearby
 * Find active rides whose destination is within `destRadius` km of [destLat, destLng].
 * Optionally also filter by origin proximity if [originLat, originLng] are provided.
 *
 * Query params:
 *   destLat, destLng   — clicked map coordinates (required)
 *   destRadius         — km radius around destination  (default 10)
 *   originLat, originLng — user current location       (optional)
 *   originRadius       — km radius around user location (default 15)
 */
const getNearbyRides = async (req, res, next) => {
  try {
    const {
      destLat, destLng,
      destRadius = 10,
      originLat, originLng,
      originRadius = 15,
    } = req.query;

    if (!destLat || !destLng) return error(res, 400, 'destLat and destLng are required.');

    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);
    const dR   = parseFloat(destRadius);
    const oLat = originLat ? parseFloat(originLat) : null;
    const oLng = originLng ? parseFloat(originLng) : null;
    const oR   = parseFloat(originRadius);

    if (isNaN(dLat) || isNaN(dLng) || isNaN(dR)) {
      return error(res, 400, 'Invalid coordinate values.');
    }

    // Load all active rides that have route data — the route collection is small enough
    // that this is fast; no change to the Ride schema required.
    const rides = await Ride.find({
      type: 'Offer',
      state: { $in: ['Active', 'Full'] },
      departureDateTime: { $gte: new Date() },
    })
      .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture')
      .populate('vehicleId', 'brand model color sizeCategory luggageCapacity licensePlate smokingPolicy')
      .populate('route');

    // Filter by Haversine distance
    const nearby = rides.filter((ride) => {
      const r = ride.route;
      if (!r || r.destinationLatitude == null) return false;

      const distToDest = haversineKM(dLat, dLng, r.destinationLatitude, r.destinationLongitude);
      if (distToDest > dR) return false;

      if (oLat !== null && oLng !== null) {
        const distFromOrigin = haversineKM(oLat, oLng, r.originLatitude, r.originLongitude);
        if (distFromOrigin > oR) return false;
      }

      // Attach computed distance so the client can sort/display it
      ride._doc.distanceToDestKM = Math.round(distToDest * 10) / 10;
      return true;
    });

    // Sort by proximity to tapped destination
    nearby.sort((a, b) => (a._doc.distanceToDestKM || 0) - (b._doc.distanceToDestKM || 0));

    return success(res, 200, `${nearby.length} nearby ride(s) found.`, {
      rides: nearby,
      meta: { destLat: dLat, destLng: dLng, destRadius: dR, originRadius: oR },
    });
  } catch (err) { next(err); }
};

module.exports = {
  postRideOffer, modifyRide, cancelRide, completeRide,
  markAttendance, getAttendance,
  getAvailableRides, getRideDetails, getMyRides,
  getNearbyRides,
};
