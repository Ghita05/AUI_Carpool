const { Ride, Booking, Notification, User } = require('../models');
const { success, error } = require('../utils/responses');

const postRideOffer = async (req, res, next) => {
  try {
    const {
      vehicleId, departureLocation, destination, stops,
      departureDateTime, totalSeats, pricePerSeat, genderPreference,
      route,
    } = req.body;

    const routeData = route
      ? {
          originLatitude: route.originLat,
          originLongitude: route.originLng,
          destinationLatitude: route.destLat,
          destinationLongitude: route.destLng,
          distanceKM: route.distanceKM,
          durationMinutes: route.durationMinutes,
        }
      : null;

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
  } catch (err) {
    next(err);
  }
};

const modifyRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own rides.');
    }

    if (['Completed', 'Cancelled'].includes(ride.status)) {
      return error(res, 400, `Cannot modify a ${ride.status.toLowerCase()} ride.`);
    }

    const allowedFields = [
      'departureLocation', 'destination', 'stops', 'departureDateTime',
      'totalSeats', 'pricePerSeat', 'genderPreference',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.totalSeats) {
      const bookedSeats = ride.totalSeats - ride.availableSeats;
      const newAvailable = updates.totalSeats - bookedSeats;
      if (newAvailable < 0) {
        return error(res, 400, 'Cannot reduce seats below current bookings.');
      }
      updates.availableSeats = newAvailable;
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.rideId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Ride updated.', { ride: updatedRide });
  } catch (err) {
    next(err);
  }
};

const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only cancel your own rides.');
    }

    ride.status = 'Cancelled';
    await ride.save({ validateModifiedOnly: true });

    const confirmedBookings = await Booking.find({
      rideId: ride._id,
      status: 'Confirmed',
    });

    const reason = req.body.reason || 'Ride cancelled by driver';

    for (const booking of confirmedBookings) {
      booking.status = 'Cancelled';
      booking.cancellationDate = new Date();
      booking.cancellationReason = `Ride cancelled by driver: ${reason}`;
      await booking.save({ validateModifiedOnly: true });

      await Notification.create({
        userId: booking.passengerId,
        title: 'Booking Cancelled',
        content: `Your booking for ${ride.destination} on ${ride.departureDateTime.toLocaleDateString()} has been cancelled by the driver. Reason: ${reason}`,
        type: 'Cancellation',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { cancellationCount: 1 },
    });

    return success(res, 200, 'Ride cancelled.', {
      affectedBookings: confirmedBookings.length,
    });
  } catch (err) {
    next(err);
  }
};

const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the driver can complete a ride.');
    }

    ride.status = 'Completed';
    await ride.save({ validateModifiedOnly: true });

    await Booking.updateMany(
      { rideId: ride._id, status: 'Confirmed' },
      { $set: { status: 'Completed' } }
    );

    const bookings = await Booking.find({ rideId: ride._id, status: 'Completed' });
    const passengerIds = bookings.map((b) => b.passengerId);

    await User.updateMany(
      { _id: { $in: [...passengerIds, ride.driverId] } },
      { $inc: { totalCompletedRides: 1 } }
    );

    for (const pid of passengerIds) {
      await Notification.create({
        userId: pid,
        title: 'Ride Completed',
        content: `Your ride to ${ride.destination} has been completed. Don't forget to rate your driver!`,
        type: 'Alert',
      });
    }

    return success(res, 200, 'Ride completed.', { completedBookings: bookings.length });
  } catch (err) {
    next(err);
  }
};

const getAvailableRides = async (req, res, next) => {
  try {
    const {
      destination, departureLocation, date,
      sortBy = 'departureDateTime', order = 'asc',
      minPrice, maxPrice, genderPreference,
      page = 1, limit = 20,
    } = req.query;

    const filter = { status: { $in: ['Active', 'Full'] } };

    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (departureLocation) filter.departureLocation = { $regex: departureLocation, $options: 'i' };
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.departureDateTime = { $gte: startOfDay, $lte: endOfDay };
    }

    if (minPrice || maxPrice) {
      filter.pricePerSeat = {};
      if (minPrice) filter.pricePerSeat.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerSeat.$lte = Number(maxPrice);
    }

    if (genderPreference) filter.genderPreference = genderPreference;

    const sortField = {
      date: 'departureDateTime',
      price: 'pricePerSeat',
      seats: 'availableSeats',
    }[sortBy] || 'departureDateTime';
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
  } catch (err) {
    next(err);
  }
};

const getRideDetails = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('driverId', 'firstName lastName averageRating totalCompletedRides profilePicture phoneNumber smokingPreference drivingStyle')
      .populate('vehicleId');

    if (!ride) return error(res, 404, 'Ride not found.');

    return success(res, 200, 'Ride details retrieved.', { ride });
  } catch (err) {
    next(err);
  }
};

const getMyRides = async (req, res, next) => {
  try {
    const { status = 'upcoming' } = req.query;

    let filter = { driverId: req.user._id };

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
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postRideOffer,
  modifyRide,
  cancelRide,
  completeRide,
  getAvailableRides,
  getRideDetails,
  getMyRides,
};