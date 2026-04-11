const mongoose = require('mongoose');
const { Ride, Booking, Notification, User } = require('../models');
const { success, error } = require('../utils/responses');

const bookRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { pickupLocation = '', luggageDeclaration = '' } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.status !== 'Active') {
      return error(res, 400, 'This ride is not available for booking.');
    }

    if (ride.driverId.toString() === req.user._id.toString()) {
      return error(res, 400, 'You cannot book your own ride.');
    }

    // Always book 1 seat only
    const seatsCount = 1;
    if (ride.availableSeats < seatsCount) {
      return error(res, 400, `Only ${ride.availableSeats} seat(s) available.`);
    }

    const existingBooking = await Booking.findOne({
      rideId,
      passengerId: req.user._id,
      status: { $in: ['Confirmed', 'Pending'] },
    });
    if (existingBooking) {
      return error(res, 409, 'You already have a seat in this ride. You cannot book more than one.');
    }

    const booking = await Booking.create({
      rideId,
      passengerId: req.user._id,
      seatsCount,
      pickupLocation,
      luggageDeclaration,
      status: 'Confirmed',
    });

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      { $inc: { availableSeats: -seatsCount } },
      { new: true }
    );

    if (updatedRide.availableSeats <= 0) {
      updatedRide.status = 'Full';
      await updatedRide.save({ validateModifiedOnly: true });
    }

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

    return success(res, 201, 'Booking confirmed.', { bookingId: booking._id, booking });
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

    if (ride.status !== 'Active') {
      return error(res, 400, 'This ride is not available for booking.');
    }

    if (ride.availableSeats < totalSeatsNeeded) {
      return error(res, 400, `Only ${ride.availableSeats} seat(s) available, need ${totalSeatsNeeded}.`);
    }

    const groupId = new mongoose.Types.ObjectId();
    const bookingIds = [];

    for (const passengerId of passengerIds) {
      const booking = await Booking.create({
        rideId, passengerId, groupId, seatsCount: 1,
        pickupLocation, luggageDeclaration, status: 'Confirmed',
      });
      bookingIds.push(booking._id);

      await Notification.create({
        userId: passengerId,
        title: 'Group Booking Confirmed',
        content: `Your group booking for ${ride.destination} is confirmed.`,
        type: 'Booking',
      });
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      { $inc: { availableSeats: -totalSeatsNeeded } },
      { new: true }
    );

    if (updatedRide.availableSeats <= 0) {
      updatedRide.status = 'Full';
      await updatedRide.save({ validateModifiedOnly: true });
    }

    await Notification.create({
      userId: ride.driverId,
      title: 'New Group Booking',
      content: `A group of ${totalSeatsNeeded} booked seats on your ride to ${ride.destination}.`,
      type: 'Booking',
    });

    return success(res, 201, 'Group booking confirmed.', { groupId, bookingIds });
  } catch (err) {
    next(err);
  }
};

const declareLuggage = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { luggageDeclaration } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own bookings.');
    }

    booking.luggageDeclaration = luggageDeclaration;
    await booking.save({ validateModifiedOnly: true });

    return success(res, 200, 'Luggage declaration updated.', { booking });
  } catch (err) {
    next(err);
  }
};

const requestAdditionalStop = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { stopLocation } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own bookings.');
    }

    booking.pickupLocation = stopLocation;
    await booking.save({ validateModifiedOnly: true });

    const ride = await Ride.findById(booking.rideId);
    if (ride) {
      await Notification.create({
        userId: ride.driverId,
        title: 'Stop Request',
        content: `${req.user.firstName} requested a pickup at ${stopLocation}.`,
        type: 'Alert',
      });
    }

    return success(res, 200, 'Stop request submitted.', { booking });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason = 'Cancelled by passenger' } = req.body;

    const booking = await Booking.findById(bookingId);
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

    // Get the ride to check it exists (but don't enforce time limit for passengers)
    const ride = await Ride.findById(booking.rideId);
    if (!ride) return error(res, 404, 'Associated ride not found.');

    // Passengers can cancel anytime - no time limit like drivers have
    booking.status = 'Cancelled';
    booking.cancellationDate = new Date();
    booking.cancellationReason = reason;
    await booking.save({ validateModifiedOnly: true });

    const updatedRide = await Ride.findByIdAndUpdate(
      booking.rideId,
      { $inc: { availableSeats: booking.seatsCount } },
      { new: true }
    );

    if (updatedRide && updatedRide.status === 'Full') {
      updatedRide.status = 'Active';
      await updatedRide.save({ validateModifiedOnly: true });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { cancellationCount: 1 },
    });

    if (ride) {
      const passenger = await User.findById(req.user._id).select('firstName lastName');
      const passengerName = `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim();

      // Only send a notification to the driver, not a message
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
    }

    return success(res, 200, 'Booking cancelled successfully.', { bookingId: booking._id });
  } catch (err) {
    next(err);
  }

};

const getCurrentBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      passengerId: req.user._id,
      status: { $in: ['Confirmed', 'Pending'] },
    })
      .populate({
        path: 'rideId',
        populate: [
          { path: 'driverId', select: 'firstName lastName averageRating profilePicture' },
          { path: 'vehicleId', select: 'brand model color sizeCategory' },
        ],
      })
      .sort({ date: -1 });

    return success(res, 200, `${bookings.length} current booking(s).`, { bookings });
  } catch (err) {
    next(err);
  }
};

const getBookingHistory = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ passengerId: req.user._id })
      .populate({
        path: 'rideId',
        populate: [
          { path: 'driverId', select: 'firstName lastName' },
          { path: 'vehicleId', select: 'brand model' },
        ],
      })
      .sort({ date: -1 });

    return success(res, 200, `${bookings.length} booking(s) in history.`, { bookings });
  } catch (err) {
    next(err);
  }
};

const getPassengerList = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return error(res, 404, 'Ride not found.');

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the ride driver can view the passenger list.');
    }

    const bookings = await Booking.find({
      rideId: ride._id,
      status: { $in: ['Confirmed', 'Pending'] },
    }).populate('passengerId', 'firstName lastName phoneNumber profilePicture');

    const passengers = bookings.map((b) => ({
      booking: {
        _id: b._id,
        seatsCount: b.seatsCount,
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

module.exports = {
  bookRide,
  bookGroupRide,
  declareLuggage,
  requestAdditionalStop,
  cancelBooking,
  getCurrentBookings,
  getBookingHistory,
  getPassengerList,
};