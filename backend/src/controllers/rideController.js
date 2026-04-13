/**
 * controllers/rideController.js
 * Changes from previous version:
 *  1. postRideOffer — auto-computes route via Google Maps server-side
 *  2. completeRide  — requires attendance to be marked first
 *  3. markAttendance (NEW) — driver marks Present/Absent per passenger
 *  4. getAttendance  (NEW) — driver fetches passenger list with status
 */

const { Ride, Booking, Notification, User, Message } = require('../models');
const { success, error } = require('../utils/responses');
const { getDirections } = require('../utils/maps');

// ── postRideOffer ─────────────────────────────────────────────────────────────
const postRideOffer = async (req, res, next) => {
  try {
    const {
      vehicleId, departureLocation, destination, stops,
      departureDateTime, totalSeats, pricePerSeat, genderPreference,
    } = req.body;

    const now = new Date();
    const depTime = new Date(departureDateTime);
    if (depTime <= now) return error(res, 400, 'Departure time cannot be in the past.');
    if (depTime - now < 60 * 60 * 1000) return error(res, 400, 'Departure time must be at least 1 hour from now.');

    // Auto-compute route server-side. Client no longer sends route data.
    // Fail gracefully: if Maps is unavailable, save the ride with null route.
    let routeData = null;
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

    const ride = await Ride.create({
      driverId: req.user._id,
      vehicleId,
      departureLocation,
      destination,
      stops: stops || [],
      departureDateTime,
      totalSeats,
      availableSeats: totalSeats,
      pricePerSeat,
      genderPreference: genderPreference || 'All',
      route: routeData,
    });

    return success(res, 201, 'Ride offer published.', { rideId: ride._id, ride });
  } catch (err) { next(err); }
};

// ── modifyRide ────────────────────────────────────────────────────────────────
const modifyRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'You can only modify your own rides.');
    if (['Completed', 'Cancelled'].includes(ride.status)) return error(res, 400, `Cannot modify a ${ride.status.toLowerCase()} ride.`);

    if (req.body.departureDateTime) {
      const now = new Date();
      const newTime = new Date(req.body.departureDateTime);
      const oldTime = new Date(ride.departureDateTime);
      if ((ride.timeChangeCount || 0) >= 10) return error(res, 400, 'Maximum time changes (10) reached for this ride.');
      if (newTime <= now) return error(res, 400, 'Departure time cannot be in the past.');
      if (newTime - now < 60 * 60 * 1000) return error(res, 400, 'Departure time must be at least 1 hour from now.');
      if (Math.abs(newTime - oldTime) > 24 * 60 * 60 * 1000) return error(res, 400, 'Time can only be changed within ±24 hours of the original departure time.');
    }

    const allowedFields = ['departureLocation', 'destination', 'stops', 'departureDateTime', 'totalSeats', 'genderPreference'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.body.pricePerSeat !== undefined) return error(res, 400, 'Ride price cannot be edited after creation.');

    if (updates.totalSeats) {
      const bookedSeats = ride.totalSeats - ride.availableSeats;
      const newAvailable = updates.totalSeats - bookedSeats;
      if (newAvailable < 0) return error(res, 400, 'Cannot reduce seats below current bookings.');
      updates.availableSeats = newAvailable;
    }

    if (updates.departureDateTime) updates.timeChangeCount = (ride.timeChangeCount || 0) + 1;

    const updatedRide = await Ride.findByIdAndUpdate(req.params.rideId, { $set: updates }, { new: true, runValidators: true });
    return success(res, 200, 'Ride updated.', { ride: updatedRide });
  } catch (err) { next(err); }
};

// ── cancelRide ────────────────────────────────────────────────────────────────
const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'You can only cancel your own rides.');
    if (['Completed', 'Cancelled'].includes(ride.status)) return error(res, 400, `Cannot cancel a ${ride.status.toLowerCase()} ride.`);

    const now = new Date();
    const departurTime = new Date(ride.departureDateTime);
    if (departurTime - now < 2 * 60 * 60 * 1000) return error(res, 400, 'Cannot cancel a ride within 2 hours of departure.');

    ride.status = 'Cancelled';
    ride.cancellationReason = req.body.reason || 'Cancelled by driver';
    ride.cancellationDate = new Date();
    await ride.save({ validateModifiedOnly: true });

    const confirmedBookings = await Booking.find({ rideId: ride._id, status: 'Confirmed' });
    const reason = req.body.reason || 'Ride cancelled by driver';
    const driver = await User.findById(ride.driverId).select('firstName lastName');
    const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();

    for (const booking of confirmedBookings) {
      booking.status = 'Cancelled';
      booking.cancellationDate = new Date();
      booking.cancellationReason = `Ride cancelled by driver: ${reason}`;
      await booking.save({ validateModifiedOnly: true });

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

// ── markAttendance ────────────────────────────────────────────────────────────
// PUT /api/rides/:rideId/attendance
// Driver marks each passenger Present or Absent before completing the ride.
// Absent passengers get a no-show penalty (cancellationCount++).
const markAttendance = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can mark attendance.');
    if (!['Active', 'Full'].includes(ride.status)) return error(res, 400, 'Attendance can only be marked for active rides.');

    // Allow marking 30 minutes before departure onwards
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

      const booking = await Booking.findOne({ _id: bookingId, rideId: ride._id, status: 'Confirmed' });
      if (!booking) continue;

      booking.attendanceStatus = status;
      await booking.save({ validateModifiedOnly: true });

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

// ── getAttendance ─────────────────────────────────────────────────────────────
// GET /api/rides/:rideId/attendance
// Driver fetches passenger list with attendanceStatus for the check-in panel.
const getAttendance = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can view attendance.');

    const bookings = await Booking.find({ rideId: ride._id, status: 'Confirmed' })
      .populate('passengerId', 'firstName lastName profilePicture phoneNumber');

    const attendanceList = bookings.map((b) => ({
      bookingId: b._id,
      passenger: b.passengerId,
      seatsCount: b.seatsCount,
      pickupLocation: b.pickupLocation,
      attendanceStatus: b.attendanceStatus, // null = not yet marked
    }));

    return success(res, 200, `${attendanceList.length} passenger(s).`, {
      ride: { _id: ride._id, destination: ride.destination, departureDateTime: ride.departureDateTime, status: ride.status },
      attendance: attendanceList,
      allMarked: attendanceList.every((a) => a.attendanceStatus !== null),
    });
  } catch (err) { next(err); }
};

// ── completeRide ──────────────────────────────────────────────────────────────
// Requires at least one passenger to have been attendance-marked before completing.
const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');
    if (ride.driverId.toString() !== req.user._id.toString()) return error(res, 403, 'Only the driver can complete a ride.');
    if (!['Active', 'Full'].includes(ride.status)) return error(res, 400, `Cannot complete a ${ride.status.toLowerCase()} ride.`);

    const confirmedBookings = await Booking.find({ rideId: ride._id, status: 'Confirmed' });

    // Enforce attendance gate only when there are passengers
    if (confirmedBookings.length > 0) {
      const anyMarked = confirmedBookings.some((b) => b.attendanceStatus !== null);
      if (!anyMarked) return error(res, 400, 'Please mark attendance before completing the ride.');
    }

    ride.status = 'Completed';
    await ride.save({ validateModifiedOnly: true });

    await Booking.updateMany({ rideId: ride._id, status: 'Confirmed' }, { $set: { status: 'Completed' } });

    // Only credit present passengers (absent already penalised in markAttendance)
    const presentPassengerIds = confirmedBookings
      .filter((b) => b.attendanceStatus !== 'Absent')
      .map((b) => b.passengerId);

    await User.updateMany(
      { _id: { $in: [...presentPassengerIds, ride.driverId] } },
      { $inc: { totalCompletedRides: 1 } }
    );

    for (const pid of presentPassengerIds) {
      await Notification.create({
        userId: pid,
        title: 'Ride Completed — Rate Your Driver!',
        content: `Your ride to ${ride.destination} is complete. How was your experience? Leave a review for your driver.`,
        type: 'Alert',
      });
    }

    await Notification.create({
      userId: ride.driverId,
      title: 'Ride Completed',
      content: `Your ride to ${ride.destination} has been marked as completed.`,
      type: 'Alert',
    });

    return success(res, 200, 'Ride completed.', {
      completedBookings: confirmedBookings.length,
      presentPassengers: presentPassengerIds.length,
    });
  } catch (err) { next(err); }
};

// ── getAvailableRides ─────────────────────────────────────────────────────────
const getAvailableRides = async (req, res, next) => {
  try {
    const {
      destination, departureLocation, date,
      sortBy = 'departureDateTime', order = 'asc',
      minPrice, maxPrice, genderPreference,
      page = 1, limit = 20,
    } = req.query;

    const filter = { status: 'Active', departureDateTime: { $gte: new Date() } };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (departureLocation) filter.departureLocation = { $regex: departureLocation, $options: 'i' };
    if (date) {
      const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
      filter.departureDateTime = { $gte: startOfDay, $lte: endOfDay };
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

    const [rides, total] = await Promise.all([
      Ride.find(filter)
        .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture')
        .populate('vehicleId', 'brand model color sizeCategory luggageCapacity licensePlate smokingPolicy')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Ride.countDocuments(filter),
    ]);

    return success(res, 200, `${rides.length} ride(s) found.`, {
      rides,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

// ── getRideDetails ────────────────────────────────────────────────────────────
const getRideDetails = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture phoneNumber smokingPreference drivingStyle')
      .populate('vehicleId');
    if (!ride) return error(res, 404, 'Ride not found.');
    return success(res, 200, 'Ride details retrieved.', { ride });
  } catch (err) { next(err); }
};

// ── getMyRides ────────────────────────────────────────────────────────────────
const getMyRides = async (req, res, next) => {
  try {
    const { status = 'upcoming' } = req.query;
    const filter = { driverId: req.user._id };
    if (status === 'upcoming') {
      filter.status = { $in: ['Active', 'Full'] };
      filter.departureDateTime = { $gte: new Date() };
    } else {
      filter.status = { $in: ['Completed', 'Cancelled'] };
    }
    const rides = await Ride.find(filter)
      .populate('vehicleId', 'brand model color')
      .sort({ departureDateTime: status === 'upcoming' ? 1 : -1 });
    return success(res, 200, `${rides.length} ride(s) found.`, { rides });
  } catch (err) { next(err); }
};

module.exports = {
  postRideOffer, modifyRide, cancelRide, completeRide,
  markAttendance, getAttendance,
  getAvailableRides, getRideDetails, getMyRides,
};
