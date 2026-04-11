const { Ride, Vehicle, User } = require('../models');
// Accept a ride request: create a ride for the driver, create booking(s) for passenger(s), notify, mark request as accepted
const acceptRideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const driverId = req.user._id;

    const request = await RideRequest.findById(requestId);
    if (!request) return error(res, 404, 'Ride request not found.');
    if (request.status !== 'Open') return error(res, 400, 'This request is no longer available.');
    if (request.passengerId.toString() === driverId.toString()) return error(res, 400, 'You cannot accept your own ride request.');

    // Find driver's vehicle (pick first for now)
    const vehicle = await Vehicle.findOne({ ownerId: driverId });
    if (!vehicle) return error(res, 400, 'You must have a registered vehicle to accept ride requests.');

    // Create the ride
    const ride = await Ride.create({
      driverId,
      vehicleId: vehicle._id,
      departureLocation: request.departureLocation,
      destination: request.destination,
      departureDateTime: request.travelDateTime,
      totalSeats: request.passengerCount,
      availableSeats: 0, // All seats are booked by the requester
      pricePerSeat: request.maxPrice,
      genderPreference: 'All',
      stops: [],
    });

    // Create booking(s) for the passenger(s)
    const Booking = require('../models/Booking');
    await Booking.create({
      rideId: ride._id,
      passengerId: request.passengerId,
      seatsCount: request.passengerCount,
      status: 'Confirmed',
    });

    // Mark request as accepted and link ride
    request.status = 'Accepted';
    request.acceptedRideId = ride._id;
    await request.save({ validateModifiedOnly: true });

    // Notify the passenger
    await Notification.create({
      userId: request.passengerId,
      title: 'Ride Request Accepted',
      content: `Your ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
      type: 'Alert',
    });

    return success(res, 200, 'Ride request accepted, ride created, and booking confirmed.', { ride });
  } catch (err) {
    next(err);
  }
};

// Dismiss a ride request for a driver (hide it from their view only)
const dismissRideRequest = async (req, res, next) => {
  try {
    // For simplicity, store dismissed request IDs in the driver's user doc (or use a separate collection for production)
    const { requestId } = req.params;
    const driverId = req.user._id;
    const user = await User.findById(driverId);
    if (!user) return error(res, 404, 'User not found.');
    if (!user.dismissedRideRequests) user.dismissedRideRequests = [];
    if (!user.dismissedRideRequests.includes(requestId)) {
      user.dismissedRideRequests.push(requestId);
      await user.save({ validateModifiedOnly: true });
    }
    return success(res, 200, 'Ride request dismissed.');
  } catch (err) {
    next(err);
  }
};
const { RideRequest, Notification } = require('../models');
const { success, error } = require('../utils/responses');

const postRideRequest = async (req, res, next) => {
  try {
    const {
      departureLocation, destination, travelDateTime,
      passengerCount, maxPrice, notes, groupPassengerIds
    } = req.body;

    // Validate travel time is in the future (at least 1 hour from now)
    const now = new Date();
    const travelTime = new Date(travelDateTime);
    const minTimeFromNow = 60 * 60 * 1000; // 1 hour
    if (travelTime <= now) {
      return error(res, 400, 'Travel time cannot be in the past.');
    }
    if (travelTime - now < minTimeFromNow) {
      return error(res, 400, 'Travel time must be at least 1 hour from now.');
    }

    // If groupPassengerIds is present and is an array, treat as group request
    if (Array.isArray(groupPassengerIds) && groupPassengerIds.length > 1) {
      // Validate all users exist
      const users = await User.find({ _id: { $in: groupPassengerIds } });
      if (users.length !== groupPassengerIds.length) {
        return error(res, 400, 'One or more selected users do not exist.');
      }
      // Prevent duplicate requests for any user in group for same time/location
      const existing = await RideRequest.findOne({
        passengerId: { $in: groupPassengerIds },
        departureLocation,
        destination,
        travelDateTime,
        status: 'Open',
      });
      if (existing) {
        return error(res, 409, 'One or more users already have an open request for this ride/time.');
      }
      const request = await RideRequest.create({
        passengerId: req.user._id, // requester is the owner
        departureLocation, destination, travelDateTime,
        passengerCount: groupPassengerIds.length,
        maxPrice, notes: notes || '',
        groupPassengerIds,
      });
      return success(res, 201, 'Group ride request posted.', { requestId: request._id, request });
    }

    // Single request: enforce only 1 seat and no duplicate open requests
    if (parseInt(passengerCount, 10) !== 1) {
      return error(res, 400, 'You can only request one seat unless making a group request.');
    }
    const existing = await RideRequest.findOne({
      passengerId: req.user._id,
      departureLocation,
      destination,
      travelDateTime,
      status: 'Open',
    });
    if (existing) {
      return error(res, 409, 'You already have an open ride request for this ride/time.');
    }
    const request = await RideRequest.create({
      passengerId: req.user._id,
      departureLocation, destination, travelDateTime,
      passengerCount: 1,
      maxPrice, notes: notes || '',
    });
    return success(res, 201, 'Ride request posted.', { requestId: request._id, request });
  } catch (err) {
    next(err);
  }
};

const modifyRideRequest = async (req, res, next) => {
  try {
    const request = await RideRequest.findById(req.params.requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own requests.');
    }

    if (request.status !== 'Open') {
      return error(res, 400, 'Can only modify open requests.');
    }

    // Check if travel time is being changed
    if (req.body.travelDateTime) {
      const now = new Date();
      const newTime = new Date(req.body.travelDateTime);
      const minTimeFromNow = 60 * 60 * 1000; // 1 hour

      // Ensure new time is NOT in the past
      if (newTime <= now) {
        return error(res, 400, 'Travel time cannot be in the past.');
      }

      // Ensure new time is at least 1 hour from now
      if (newTime - now < minTimeFromNow) {
        return error(res, 400, 'Travel time must be at least 1 hour from now.');
      }
    }

    const allowedFields = [
      'departureLocation', 'destination', 'travelDateTime',
      'passengerCount', 'maxPrice', 'notes',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await RideRequest.findByIdAndUpdate(
      req.params.requestId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Ride request updated.', { request: updated });
  } catch (err) {
    next(err);
  }
};

const deleteRideRequest = async (req, res, next) => {
  try {
    const request = await RideRequest.findById(req.params.requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only delete your own requests.');
    }

    await RideRequest.findByIdAndDelete(req.params.requestId);
    return success(res, 200, 'Ride request deleted.');
  } catch (err) {
    next(err);
  }
};


const getRideRequests = async (req, res, next) => {
  try {
    const { destination, date, sortBy = 'date', order = 'desc' } = req.query;

    const filter = { status: 'Open' };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.travelDateTime = { $gte: start, $lte: end };
    }


    // Exclude requests dismissed by the current driver
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (user && user.dismissedRideRequests && user.dismissedRideRequests.length > 0) {
      filter._id = { $nin: user.dismissedRideRequests };
    }

    // Exclude requests where the current user is the passenger (driver shouldn't see their own requests)
    filter.passengerId = { $ne: req.user._id };

    const sortField = sortBy === 'passengers' ? 'passengerCount' : 'travelDateTime';
    const sortOrder = order === 'asc' ? 1 : -1;

    const requests = await RideRequest.find(filter)
      .populate('passengerId', 'firstName lastName averageRating')
      .sort({ [sortField]: sortOrder });

    return success(res, 200, `${requests.length} request(s) found.`, { requests });
  } catch (err) {
    next(err);
  }
};

const getMyRideRequests = async (req, res, next) => {
  try {
    const requests = await RideRequest.find({ passengerId: req.user._id })
      .sort({ creationDate: -1 });
    return success(res, 200, `${requests.length} request(s).`, { requests });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postRideRequest,
  modifyRideRequest,
  deleteRideRequest,
  acceptRideRequest,
  dismissRideRequest,
  getRideRequests,
  getMyRideRequests,
};