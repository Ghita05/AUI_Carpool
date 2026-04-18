const mongoose = require('mongoose');
const { Ride, Notification, User, Message, Review } = require('../models');
const { success, error } = require('../utils/responses');
const { isStopOnRoute, getDirections } = require('../utils/maps');

const bookRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const {
      pickupLocation = '',
      luggageDeclaration = '',
    } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.type !== 'Offer') {
      return error(res, 400, 'Can only book offer rides.');
    }

    if (ride.state !== 'Active') {
      return error(res, 400, 'This ride is not available for booking.');
    }

    if (ride.driverId.toString() === req.user._id.toString()) {
      return error(res, 400, 'You cannot book your own ride.');
    }

    if (ride.availableSeats < 1) {
      return error(res, 400, `Only ${ride.availableSeats} seat(s) available.`);
    }

    // Check no existing confirmed booking for this passenger
    const alreadyBooked = ride.bookings.some(
      b => b.passengerId.equals(req.user._id) && b.status === 'Confirmed'
    );
    if (alreadyBooked) {
      return error(res, 409, 'You already have a seat in this ride. You cannot book more than one.');
    }

    // ── Inner city stop validation ─────────────────────────────────────────
    // Push booking and decrement seats atomically
    const newBooking = {
      passengerId: req.user._id,
      pickupLocation,
      luggageDeclaration,
      price: ride.pricePerSeat,
      status: 'Confirmed',
    };

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      {
        $push: { bookings: newBooking },
        $inc: { availableSeats: -1 },
      },
      { new: true }
    );

    if (updatedRide.availableSeats <= 0) {
      await Ride.findByIdAndUpdate(rideId, { $set: { state: 'Full' } });
    }

    // Get the newly created booking subdoc
    const createdBooking = updatedRide.bookings[updatedRide.bookings.length - 1];

    await Notification.create({
      userId: req.user._id,
      title: 'Booking Confirmed',
      content: `Your booking for ${ride.destination} on ${ride.departureDateTime.toLocaleDateString()} is confirmed.`,
      type: 'Booking',
    });

    await Notification.create({
      userId: ride.driverId,
      title: 'New Booking',
      content: `${req.user.firstName} ${req.user.lastName} booked a seat on your ride to ${ride.destination}.`,
      type: 'Booking',
    });

    return success(res, 201, 'Booking confirmed.', { bookingId: createdBooking._id, booking: createdBooking });
  } catch (err) {
    next(err);
  }
};

const bookGroupRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { passengerIds, pickupLocation = '', luggageDeclaration = '' } = req.body;

    if (!passengerIds || !Array.isArray(passengerIds) || passengerIds.length === 0) {
      return error(res, 400, 'Passenger IDs array is required for group booking.');
    }

    const totalSeatsNeeded = passengerIds.length;
    const ride = await Ride.findById(rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.type !== 'Offer') {
      return error(res, 400, 'Can only book offer rides.');
    }

    if (ride.state !== 'Active') {
      return error(res, 400, 'This ride is not available for booking.');
    }

    if (ride.availableSeats < totalSeatsNeeded) {
      return error(res, 400, `Only ${ride.availableSeats} seat(s) available, need ${totalSeatsNeeded}.`);
    }

    const groupId = new mongoose.Types.ObjectId();
    const bookingDocs = passengerIds.map(passengerId => ({
      passengerId,
      groupId,
      pickupLocation,
      luggageDeclaration,
      price: ride.pricePerSeat,
      status: 'Confirmed',
    }));

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      {
        $push: { bookings: { $each: bookingDocs } },
        $inc: { availableSeats: -totalSeatsNeeded },
      },
      { new: true }
    );

    if (updatedRide.availableSeats <= 0) {
      await Ride.findByIdAndUpdate(rideId, { $set: { state: 'Full' } });
    }

    for (const passengerId of passengerIds) {
      await Notification.create({
        userId: passengerId,
        title: 'Group Booking Confirmed',
        content: `Your group booking for ${ride.destination} is confirmed.`,
        type: 'Booking',
      });
    }

    await Notification.create({
      userId: ride.driverId,
      title: 'New Group Booking',
      content: `A group of ${totalSeatsNeeded} booked seats on your ride to ${ride.destination}.`,
      type: 'Booking',
    });

    // Extract the newly created booking IDs
    const newBookings = updatedRide.bookings.slice(-totalSeatsNeeded);
    const bookingIds = newBookings.map(b => b._id);

    return success(res, 201, 'Group booking confirmed.', { groupId, bookingIds });
  } catch (err) {
    next(err);
  }
};

const declareLuggage = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { luggageDeclaration } = req.body;

    const ride = await Ride.findOne({ 'bookings._id': bookingId });
    if (!ride) return error(res, 404, 'Booking not found.');

    const booking = ride.bookings.id(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own bookings.');
    }

    await Ride.findOneAndUpdate(
      { 'bookings._id': bookingId },
      { $set: { 'bookings.$.luggageDeclaration': luggageDeclaration } }
    );

    booking.luggageDeclaration = luggageDeclaration;
    return success(res, 200, 'Luggage declaration updated.', { booking });
  } catch (err) {
    next(err);
  }
};

const requestAdditionalStop = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { stopLocation } = req.body;

    if (!stopLocation || stopLocation.trim().length === 0) {
      return error(res, 400, 'Stop location is required.');
    }

    const ride = await Ride.findOne({ 'bookings._id': bookingId });
    if (!ride) return error(res, 404, 'Booking not found.');

    const booking = ride.bookings.id(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own bookings.');
    }

    if (booking.status !== 'Confirmed') {
      return error(res, 400, 'Can only request stops for confirmed bookings.');
    }

    let mapsValidationSkipped = false;
    try {
      const { onRoute, deviationKM } = await isStopOnRoute(
        ride.departureLocation,
        ride.destination,
        stopLocation
      );

      if (!onRoute) {
        return error(
          res,
          400,
          `The requested stop "${stopLocation}" is not on the route (adds ${deviationKM} km detour). Please choose a location closer to the route.`
        );
      }
    } catch (mapsErr) {
      console.warn('[requestAdditionalStop] Maps validation failed, proceeding:', mapsErr.message);
      mapsValidationSkipped = true;
    }

    await Ride.findOneAndUpdate(
      { 'bookings._id': bookingId },
      {
        $set: {
          'bookings.$.requestedStop': stopLocation,
          'bookings.$.stopStatus': 'Pending',
          'bookings.$.stopDecisionDate': null,
        },
      }
    );

    const passengerName = `${req.user.firstName} ${req.user.lastName}`;
    const notifContent = mapsValidationSkipped
      ? `${passengerName} requested a stop at ${stopLocation} on your ride to ${ride.destination}. ⚠️ Route validation was unavailable — please verify this stop is on your route.`
      : `${passengerName} requested a stop at ${stopLocation} on your ride to ${ride.destination}.`;

    await Notification.create({
      userId: ride.driverId,
      title: 'Stop Request',
      content: notifContent,
      type: 'Alert',
    });

    await Message.create({
      senderId: req.user._id,
      receiverId: ride.driverId,
      rideId: ride._id,
      content: `Hi! I'd like to request a stop at **${stopLocation}**. Please review and let me know!`,
      action: {
        type: 'stop_request',
        rideId: ride._id,
        bookingId: booking._id,
      },
    });

    return success(res, 200, 'Stop request submitted.', { booking: { ...booking.toObject(), requestedStop: stopLocation, stopStatus: 'Pending' } });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason = 'Cancelled by passenger' } = req.body;

    const ride = await Ride.findOne({ 'bookings._id': bookingId });
    if (!ride) return error(res, 404, 'Booking not found.');

    const booking = ride.bookings.id(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only cancel your own bookings.');
    }

    if (booking.status === 'Cancelled') {
      return error(res, 400, 'Booking is already cancelled.');
    }

    if (booking.status === 'Completed') {
      return error(res, 400, 'Cannot cancel a completed booking.');
    }

    const updatedRide = await Ride.findOneAndUpdate(
      { 'bookings._id': bookingId },
      {
        $set: {
          'bookings.$.status': 'Cancelled',
          'bookings.$.cancellationReason': reason,
          'bookings.$.cancellationDate': new Date(),
        },
        $inc: { availableSeats: 1 },
      },
      { new: true }
    );

    if (updatedRide && updatedRide.state === 'Full') {
      await Ride.findByIdAndUpdate(updatedRide._id, { $set: { state: 'Active' } });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { cancellationCount: 1 },
    });

    const passenger = await User.findById(req.user._id).select('firstName lastName');
    const passengerName = `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim();

    let notificationContent = `${passengerName} cancelled their booking for your ride to ${ride.destination}.`;
    if (reason && reason.trim() && reason !== 'Cancelled by passenger') {
      notificationContent += `\nReason: ${reason.trim()}`;
    }
    await Notification.create({
      userId: ride.driverId,
      title: 'Booking Cancelled',
      content: notificationContent,
      type: 'Cancellation',
    });

    return success(res, 200, 'Booking cancelled successfully.', { bookingId });
  } catch (err) {
    next(err);
  }
};


const getCurrentBookings = async (req, res, next) => {
  try {
    const rides = await Ride.find({
      type: 'Offer',
      'bookings.passengerId': req.user._id,
      'bookings.status': { $in: ['Confirmed'] },
    })
      .populate('driverId', 'firstName lastName averageRating profilePicture')
      .populate('vehicleId', 'brand model color sizeCategory')
      .sort({ departureDateTime: -1 });

    // Map each ride to its matching booking sub-document(s)
    const bookings = [];
    for (const ride of rides) {
      for (const b of ride.bookings) {
        if (b.passengerId.equals(req.user._id) && b.status === 'Confirmed') {
          bookings.push({
            _id: b._id,
            status: b.status,
            pickupLocation: b.pickupLocation,
            luggageDeclaration: b.luggageDeclaration,
            price: b.price,
            bookedAt: b.bookedAt,
            rideId: ride,
          });
        }
      }
    }

    return success(res, 200, `${bookings.length} current booking(s).`, { bookings });
  } catch (err) {
    next(err);
  }
};

const getBookingHistory = async (req, res, next) => {
  try {
    const rides = await Ride.find({
      type: 'Offer',
      'bookings.passengerId': req.user._id,
    })
      .populate('driverId', 'firstName lastName')
      .populate('vehicleId', 'brand model')
      .sort({ departureDateTime: -1 });

    // Check which rides the user has already reviewed
    const rideIds = rides.map(r => r._id);
    const existingReviews = await Review.find({
      authorId: req.user._id,
      rideId: { $in: rideIds },
    }).select('rideId').lean();
    const reviewedRideIds = new Set(existingReviews.map(r => r.rideId.toString()));

    const bookings = [];
    for (const ride of rides) {
      for (const b of ride.bookings) {
        if (b.passengerId.equals(req.user._id)) {
          bookings.push({
            _id: b._id,
            status: b.status,
            pickupLocation: b.pickupLocation,
            luggageDeclaration: b.luggageDeclaration,
            price: b.price,
            bookedAt: b.bookedAt,
            cancellationReason: b.cancellationReason,
            cancellationDate: b.cancellationDate,
            rated: reviewedRideIds.has(ride._id.toString()),
            rideId: ride,
          });
        }
      }
    }

    return success(res, 200, `${bookings.length} booking(s) in history.`, { bookings });
  } catch (err) {
    next(err);
  }
};

const getPassengerList = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .select('bookings driverId')
      .populate('bookings.passengerId', 'firstName lastName phoneNumber profilePicture');
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the ride driver can view the passenger list.');
    }

    const passengers = ride.bookings
      .filter(b => b.status === 'Confirmed')
      .map(b => ({
        booking: {
          _id: b._id,
          pickupLocation: b.pickupLocation,
          luggageDeclaration: b.luggageDeclaration,
          status: b.status,
        },
        passenger: b.passengerId,
      }));

    return success(res, 200, `${passengers.length} passenger(s).`, { passengers });
  } catch (err) {
    next(err);
  }
};

const respondToStopRequest = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return error(res, 400, 'Approved field must be a boolean.');
    }

    const ride = await Ride.findOne({ 'bookings._id': bookingId });
    if (!ride) return error(res, 404, 'Booking not found.');

    const booking = ride.bookings.id(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the driver can respond to stop requests.');
    }

    if (!booking.requestedStop || booking.stopStatus !== 'Pending') {
      return error(res, 400, 'No pending stop request for this booking.');
    }

    const newStopStatus = approved ? 'Accepted' : 'Rejected';
    await Ride.findOneAndUpdate(
      { 'bookings._id': bookingId },
      {
        $set: {
          'bookings.$.stopStatus': newStopStatus,
          'bookings.$.stopDecisionDate': new Date(),
        },
      }
    );

    // If accepted, recalculate route with the new stop
    if (approved) {
      try {
        const stops = ride.bookings
          .filter(b => b.stopStatus === 'Accepted' && b.requestedStop)
          .map(b => b.requestedStop);
        if (!stops.includes(booking.requestedStop)) {
          stops.push(booking.requestedStop);
        }
        const directions = await getDirections(ride.departureLocation, ride.destination, stops);
        await Ride.findByIdAndUpdate(ride._id, {
          $set: {
            'route.distanceKM': directions.distanceKM,
            'route.durationMinutes': directions.durationMinutes,
            'route.polyline': directions.polyline,
          },
        });
      } catch (mapsErr) {
        console.warn('[respondToStopRequest] Route recalculation failed, keeping existing route:', mapsErr.message);
      }
    }

    const passenger = await User.findById(booking.passengerId).select('firstName lastName');
    const driverName = `${req.user.firstName} ${req.user.lastName}`;
    const decision = approved ? 'accepted' : 'rejected';

    await Notification.create({
      userId: booking.passengerId,
      title: `Stop Request ${approved ? 'Accepted' : 'Rejected'}`,
      content: `${driverName} ${decision} your stop request at ${booking.requestedStop} for the ride to ${ride.destination}.`,
      type: approved ? 'Booking' : 'Alert',
    });

    return success(res, 200, `Stop request ${decision}.`, { booking: { ...booking.toObject(), stopStatus: newStopStatus } });
  } catch (err) {
    next(err);
  }
};

const getStopRequests = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId)
      .populate('bookings.passengerId', 'firstName lastName profilePicture email');
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only view stop requests for your own rides.');
    }

    const stopBookings = ride.bookings.filter(b => b.requestedStop);

    return success(res, 200, `${stopBookings.length} stop request(s) found.`, { bookings: stopBookings });
  } catch (err) {
    next(err);
  }
};

// ── validateStopOnRoute ─────────────────────────────────────────────────────
// Called by the mobile app to check if a suggested stop location is on the ride's route.
const validateStopOnRoute = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { stopLocation } = req.query;

    if (!stopLocation || !stopLocation.trim()) {
      return error(res, 400, 'stopLocation query parameter is required.');
    }

    const ride = await Ride.findById(rideId).select('departureLocation destination');
    if (!ride) return error(res, 404, 'Ride not found.');

    try {
      const result = await isStopOnRoute(
        ride.departureLocation,
        ride.destination,
        stopLocation.trim()
      );
      return success(res, 200, 'Stop validation result.', {
        stopLocation: stopLocation.trim(),
        onRoute: result.onRoute,
        deviationKM: result.deviationKM,
      });
    } catch (mapsErr) {
      console.warn('[validateStopOnRoute] Maps API failed:', mapsErr.message);
      return success(res, 200, 'Could not validate — Maps API unavailable.', {
        stopLocation: stopLocation.trim(),
        onRoute: null,
        deviationKM: null,
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bookRide,
  bookGroupRide,
  declareLuggage,
  requestAdditionalStop,
  respondToStopRequest,
  getStopRequests,
  validateStopOnRoute,
  cancelBooking,
  getCurrentBookings,
  getBookingHistory,
  getPassengerList,
};