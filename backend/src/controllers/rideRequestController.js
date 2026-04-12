// Transfer group owner for a group ride request
const transferGroupOwner = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user._id.toString();
    const request = await RideRequest.findById(requestId);
    if (!request) return error(res, 404, 'Ride request not found.');
    // Only the current owner can transfer ownership
    if (request.passengerId.toString() !== userId) {
      return error(res, 403, 'Only the group owner can transfer ownership.');
    }
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    if (!groupIds.includes(newOwnerId)) {
      return error(res, 400, 'New owner must be a group member.');
    }
    
    // Get names for notification
    const { User, Notification } = require('../models');
    const oldOwner = await User.findById(userId);
    const newOwner = await User.findById(newOwnerId);
    const oldOwnerName = oldOwner ? `${oldOwner.firstName} ${oldOwner.lastName}` : 'Someone';
    const newOwnerName = newOwner ? `${newOwner.firstName} ${newOwner.lastName}` : 'The new owner';

    // Transfer ownership
    request.passengerId = newOwnerId;
    await request.save();

    // Notify new owner
    await Notification.create({
      userId: newOwnerId,
      title: 'You are now the group owner',
      content: `${oldOwnerName} transferred ownership of the group ride request to ${request.destination} to you.`,
      type: 'Alert',
    });

    // Notify other group members about the ownership change
    const otherMembers = groupIds.filter(id => id !== userId && id !== newOwnerId);
    for (const memberId of otherMembers) {
      await Notification.create({
        userId: memberId,
        title: 'Group Ownership Changed',
        content: `${newOwnerName} is now the owner of your group ride request to ${request.destination}.`,
        type: 'Alert',
      });
    }

    return success(res, 200, 'Ownership transferred.', { request });
  } catch (err) {
    next(err);
  }
};

// Ensure all models are imported, including Vehicle
const { RideRequest, Notification, User, Vehicle, Ride, Message } = require('../models');

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
      stops: request.stops || [],
    });

    // Create booking(s) for the passenger(s)
    const Booking = require('../models/Booking');
    const Notification = require('../models/Notification');
    const Message = require('../models/Message');
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    // Always include the owner
    const ownerId = request.passengerId.toString();
    if (!groupIds.includes(ownerId)) {
      groupIds = [ownerId, ...groupIds];
    }
    // Remove duplicates
    groupIds = [...new Set(groupIds)];

    if (groupIds.length > 1) {
      // Group request: create a booking for each member
      await Promise.all(groupIds.map(async (userId) => {
        await Booking.create({
          rideId: ride._id,
          passengerId: userId,
          seatsCount: 1,
          status: 'Confirmed',
        });
        await Notification.create({
          userId,
          title: 'Ride Request Accepted',
          content: `Your group ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
          type: 'Alert',
        });
      }));

      // Send welcome message in the group channel (identified by groupRideId)
      const driver = await User.findById(driverId).select('firstName lastName');
      const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
      const memberUsers = await User.find({ _id: { $in: groupIds } }).select('firstName lastName');
      const memberNames = memberUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ');
      await Message.create({
        senderId: driverId,
        groupRideId: ride._id,
        content: `${driverName} accepted the group ride request to ${request.destination}.\n\nGroup members: ${memberNames}\nDriver: ${driverName}\n\nUse this channel to coordinate your trip!`,
      });
    } else {
      // Solo request
      await Booking.create({
        rideId: ride._id,
        passengerId: request.passengerId,
        seatsCount: request.passengerCount,
        status: 'Confirmed',
      });
      await Notification.create({
        userId: request.passengerId,
        title: 'Ride Request Accepted',
        content: `Your ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
        type: 'Alert',
      });
      // Automated message from driver
      await Message.create({
        senderId: driverId,
        receiverId: request.passengerId,
        rideId: ride._id,
        content: `Hi! I have accepted your ride request to ${request.destination}. See you soon!`,
      });
    }

    // Mark request as accepted and link ride
    request.status = 'Accepted';
    request.acceptedRideId = ride._id;
    await request.save({ validateModifiedOnly: true });

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
// Duplicate import removed. Already declared at the top.
const { success, error } = require('../utils/responses');

const postRideRequest = async (req, res, next) => {
  try {
    const {
      departureLocation, destination, travelDateTime,
      passengerCount, maxPrice, notes, groupPassengerIds, stops
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
      // Always include the creator (owner) in groupPassengerIds
      let groupIds = groupPassengerIds.map(id => id.toString());
      const ownerId = req.user._id.toString();
      if (!groupIds.includes(ownerId)) groupIds = [ownerId, ...groupIds];
      // Validate all users exist
      const users = await User.find({ _id: { $in: groupIds } });
      if (users.length !== groupIds.length) {
        return error(res, 400, 'One or more selected users do not exist.');
      }
      // Prevent duplicate requests for any user in group for same time/location
      const existing = await RideRequest.findOne({
        passengerId: { $in: groupIds },
        departureLocation,
        destination,
        travelDateTime,
        status: 'Open',
      });
      if (existing) {
        return error(res, 409, 'One or more users already have an open request for this ride/time.');
      }
      // No restriction on user role (Driver/Passenger) for group membership
      const request = await RideRequest.create({
        passengerId: req.user._id, // requester is the owner
        departureLocation, destination, travelDateTime,
        passengerCount: groupIds.length,
        maxPrice, notes: notes || '',
        groupPassengerIds: groupIds,
        stops: stops || [],
      });
      // Notify all group members (including requester)
      const Notification = require('../models/Notification');
      const uniqueMembers = [...new Set(groupIds)];
      await Promise.all(uniqueMembers.map(async (userId) => {
        await Notification.create({
          userId,
          title: 'Ride Request Submitted',
          content: `A group ride request to ${destination} was submitted.`,
          type: 'Alert',
        });
      }));

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
      stops: stops || [],
    });
    // Notify requester
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: req.user._id,
      title: 'Ride Request Submitted',
      content: `Your ride request to ${destination} was submitted.`,
      type: 'Alert',
    });
    return success(res, 201, 'Ride request posted.', { requestId: request._id, request });
  } catch (err) {
    next(err);
  }
};
// Allow group member to leave a pending group request
const leaveRideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id.toString();
    const request = await RideRequest.findById(requestId);
    if (!request) return error(res, 404, 'Ride request not found.');
    if (request.status !== 'Open') return error(res, 400, 'Can only leave pending requests.');
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    if (!groupIds.includes(userId)) return error(res, 403, 'You are not a member of this group request.');

    // Track leave count
    let leftMembers = request.leftMembers || {};
    if (typeof leftMembers.get === 'function') {
      // Mongoose Map
      leftMembers = Object.fromEntries(request.leftMembers.entries());
    }
    leftMembers[userId] = (leftMembers[userId] || 0) + 1;
    request.leftMembers = leftMembers;

    // Get the leaving member's name for notifications
    const { User } = require('../models');
    const leavingUser = await User.findById(userId);
    const leavingUserName = leavingUser ? `${leavingUser.firstName} ${leavingUser.lastName}` : 'A member';

    // Notify all other group members with the member's name
    const Notification = require('../models/Notification');
    await Promise.all(groupIds.filter(id => id !== userId).map(async (id) => {
      await Notification.create({
        userId: id,
        title: 'Group Member Left',
        content: `${leavingUserName} has left your group ride request to ${request.destination}.`,
        type: 'Alert',
      });
    }));

    // If owner is leaving, must transfer ownership
    if (request.passengerId.toString() === userId) {
      groupIds = groupIds.filter(id => id !== userId);
      if (groupIds.length === 0) {
        await RideRequest.findByIdAndDelete(requestId);
        return success(res, 200, 'Request deleted as last member left.');
      }
      const newOwnerId = req.body.newOwnerId || groupIds[0];
      if (!groupIds.includes(newOwnerId)) return error(res, 400, 'New owner must be a group member.');
      request.passengerId = newOwnerId;
      request.groupPassengerIds = groupIds;
      request.passengerCount = groupIds.length;
      await request.save();
      return success(res, 200, 'Ownership transferred and you have left the group request.', { request });
    } else {
      // Non-owner leaves
      groupIds = groupIds.filter(id => id !== userId);
      request.groupPassengerIds = groupIds;
      request.passengerCount = groupIds.length;
      await request.save();
      return success(res, 200, 'You have left the group request.', { request });
    }
  } catch (err) {
    next(err);
  }
};

const modifyRideRequest = async (req, res, next) => {
  try {
    const request = await RideRequest.findById(req.params.requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    // Only the original requester can edit
    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the user who created the request can edit it.');
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

    // Handle re-adding left members: only allow if left < 3 times
    if (req.body.groupPassengerIds) {
      let leftMembers = request.leftMembers || {};
      if (typeof leftMembers.get === 'function') {
        leftMembers = Object.fromEntries(request.leftMembers.entries());
      }
      // Only allow adding a user if they left < 3 times
      const newIds = req.body.groupPassengerIds.map(id => id.toString());
      const oldIds = (request.groupPassengerIds || []).map(id => id.toString());
      for (const id of newIds) {
        if (!oldIds.includes(id) && leftMembers[id] >= 3) {
          return error(res, 400, 'A member cannot be re-added more than 2 times.');
        }
      }
    }

    const allowedFields = [
      'departureLocation', 'destination', 'travelDateTime',
      'passengerCount', 'maxPrice', 'notes', 'groupPassengerIds', 'stops',
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

    // Notify other group members about the edit
    const groupIds = (updated.groupPassengerIds || []).map(id => id.toString());
    if (groupIds.length > 1) {
      const owner = await User.findById(req.user._id).select('firstName lastName');
      const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'The group owner';
      const otherMembers = groupIds.filter(id => id !== req.user._id.toString());
      await Promise.all(otherMembers.map(memberId =>
        Notification.create({
          userId: memberId,
          title: 'Ride Request Updated',
          content: `${ownerName} updated the group ride request to ${updated.destination}.`,
          type: 'Alert',
        })
      ));
    }

    return success(res, 200, 'Ride request updated.', { request: updated });
  } catch (err) {
    next(err);
  }
};

const deleteRideRequest = async (req, res, next) => {
  try {
    const request = await RideRequest.findById(req.params.requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    // Only the owner can delete, and only if it's not a group request with other members
    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the user who created the request can delete it.');
    }
    // If group request and there are other members, must use leave endpoint
    const groupIds = (request.groupPassengerIds || []).map(id => id.toString()).filter(id => id !== req.user._id.toString());
    if (groupIds.length > 0) {
      return error(res, 403, 'You must transfer ownership or leave the group before deleting. Use the leave endpoint.');
    }
    await RideRequest.findByIdAndDelete(req.params.requestId);
    return success(res, 200, 'Ride request deleted.');
  } catch (err) {
    next(err);
  }
};

// Cancel entire group ride request (owner only, assumes all members agreed)
const cancelGroupRideRequest = async (req, res, next) => {
  try {
    const request = await RideRequest.findById(req.params.requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    // Only the owner can cancel
    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the request owner can cancel it.');
    }

    // Get all group members including owner
    const allMemberIds = [request.passengerId, ...(request.groupPassengerIds || [])];
    const { User } = require('../models');
    const owner = await User.findById(request.passengerId);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Someone';

    // Delete the request
    await RideRequest.findByIdAndDelete(req.params.requestId);

    // Send notifications to all members (except owner) with owner's name
    if (allMemberIds.length > 1) {
      const { Notification } = require('../models');
      const otherMembers = allMemberIds.filter(id => id.toString() !== req.user._id.toString());
      
      for (const memberId of otherMembers) {
        await Notification.create({
          userId: memberId,
          title: 'Ride Request Cancelled',
          content: `${ownerName} cancelled the group ride request to ${request.destination} on ${new Date(request.travelDateTime).toLocaleDateString()}.`,
          type: 'Cancellation',
        });
      }
    }

    return success(res, 200, 'Group ride request cancelled. All members have been notified.', { 
      cancelledFor: allMemberIds.length,
      cancellerName: ownerName 
    });
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

    // Exclude requests where the current user is the passenger or in groupPassengerIds (driver shouldn't see their own requests)
    filter.$and = [
      { passengerId: { $ne: req.user._id } },
      { groupPassengerIds: { $not: { $elemMatch: { $eq: req.user._id } } } },
    ];

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
    // Find requests where user is owner or in groupPassengerIds
    const requests = await RideRequest.find({
      $or: [
        { passengerId: req.user._id },
        { groupPassengerIds: { $in: [req.user._id] } },
      ],
    }).sort({ creationDate: -1 });
    return success(res, 200, `${requests.length} request(s).`, { requests });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postRideRequest,
  modifyRideRequest,
  deleteRideRequest,
  cancelGroupRideRequest,
  acceptRideRequest,
  dismissRideRequest,
  getRideRequests,
  getMyRideRequests,
  leaveRideRequest,
  transferGroupOwner,
};