const mongoose = require('mongoose');
const { Ride, Booking, Notification, User, Message } = require('../models');
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
      price: seatsCount * ride.pricePerSeat,
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
        pickupLocation, luggageDeclaration, price: ride.pricePerSeat, status: 'Confirmed',
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

    console.log('Stop request received:', { bookingId, stopLocation });

    if (!stopLocation || stopLocation.trim().length === 0) {
      return error(res, 400, 'Stop location is required.');
    }

    const booking = await Booking.findById(bookingId);
    console.log('Booking found:', booking);
    if (!booking) return error(res, 404, 'Booking not found.');

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own bookings.');
    }

    if (booking.status !== 'Confirmed') {
      return error(res, 400, 'Can only request stops for confirmed bookings.');
    }

    // Set the requested stop with pending status
    booking.requestedStop = stopLocation;
    booking.stopStatus = 'Pending';
    booking.stopDecisionDate = null;
    await booking.save({ validateModifiedOnly: true });

    const ride = await Ride.findById(booking.rideId);
    console.log('Ride found:', ride?._id);

    if (ride) {
      const passengerName = `${req.user.firstName} ${req.user.lastName}`;
      
      // Send notification
      const notif = await Notification.create({
        userId: ride.driverId,
        title: 'Stop Request',
        content: `${passengerName} requested a stop at ${stopLocation} on your ride to ${ride.destination}.`,
        type: 'Alert',
      });
      console.log('Notification created:', notif._id);
      
      // Send automated message to driver with action button
      const msg = await Message.create({
        senderId: req.user._id,
        receiverId: ride.driverId,
        rideId: booking.rideId,
        content: `Hi! I'd like to request a stop at **${stopLocation}**. Please review and let me know!`,
        action: {
          type: 'stop_request',
          rideId: booking.rideId,
          bookingId: booking._id,
        },
      });
      console.log('Message created:', msg._id);
    }

    return success(res, 200, 'Stop request submitted.', { booking });
  } catch (err) {
    console.error('requestAdditionalStop error:', err);
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

const respondToStopRequest = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return error(res, 400, 'Approved field must be a boolean.');
    }

    const booking = await Booking.findById(bookingId).populate('rideId', 'driverId destination');
    if (!booking) return error(res, 404, 'Booking not found.');

    // Only the driver of the associated ride can respond
    if (booking.rideId.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the driver can respond to stop requests.');
    }

    if (!booking.requestedStop || booking.stopStatus !== 'Pending') {
      return error(res, 400, 'No pending stop request for this booking.');
    }

    // Set the stop status and decision date
    booking.stopStatus = approved ? 'Accepted' : 'Rejected';
    booking.stopDecisionDate = new Date();
    await booking.save({ validateModifiedOnly: true });

    // If accepted, add the stop to the ride's stops array
    if (approved) {
      const ride = await Ride.findById(booking.rideId._id || booking.rideId);
      if (ride && !ride.stops.includes(booking.requestedStop)) {
        ride.stops.push(booking.requestedStop);
        await ride.save({ validateModifiedOnly: true });
      }
    }

    // Notify the passenger of the decision
    const passenger = await User.findById(booking.passengerId).select('firstName lastName');
    const passengerName = `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim();
    const driverName = `${req.user.firstName} ${req.user.lastName}`;

    const decision = approved ? 'accepted' : 'rejected';
    await Notification.create({
      userId: booking.passengerId,
      title: `Stop Request ${approved ? 'Accepted' : 'Rejected'}`,
      content: `${driverName} ${decision} your stop request at ${booking.requestedStop} for the ride to ${booking.rideId.destination}.`,
      type: approved ? 'Booking' : 'Alert',
    });

    return success(res, 200, `Stop request ${decision}.`, { booking });
  } catch (err) {
    next(err);
  }
};

const getStopRequests = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    console.log('getStopRequests called for rideId:', rideId);

    const ride = await Ride.findById(rideId);
    console.log('Ride found:', ride?._id);
    if (!ride) return error(res, 404, 'Ride not found.');

    console.log('Driver check - req.user._id:', req.user._id, 'ride.driverId:', ride.driverId);
    if (ride.driverId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only view stop requests for your own rides.');
    }

    const bookings = await Booking.find({
      rideId: new mongoose.Types.ObjectId(rideId),
      requestedStop: { $ne: null },
    })
      .populate('passengerId', 'firstName lastName profilePicture email')
      .sort({ stopStatus: 1, createdAt: -1 });
    
    console.log('Found bookings with stop requests:', bookings.length);
    bookings.forEach(b => {
      console.log('- Booking:', b._id, 'Stop:', b.requestedStop, 'Status:', b.stopStatus);
    });

    return success(res, 200, `${bookings.length} stop request(s) found.`, { bookings });
  } catch (err) {
    console.error('getStopRequests error:', err);
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
  cancelBooking,
  getCurrentBookings,
  getBookingHistory,
  getPassengerList,
};