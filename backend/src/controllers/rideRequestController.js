// Transfer group owner for a group ride request
const transferGroupOwner = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user._id.toString();
    const request = await Ride.findOne({ _id: requestId, type: 'Request' });
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

const { Ride, Notification, User, Vehicle, Message } = require('../models');
const { success, error } = require('../utils/responses');

// Accept a ride request: create an offer ride for the driver, embed booking(s) for passenger(s), notify, mark request as accepted
const acceptRideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const driverId = req.user._id;

    const request = await Ride.findOne({ _id: requestId, type: 'Request' });
    if (!request) return error(res, 404, 'Ride request not found.');
    if (request.state !== 'Open') return error(res, 400, 'This request is no longer available.');
    if (request.passengerId.toString() === driverId.toString()) return error(res, 400, 'You cannot accept your own ride request.');

    // Find driver's vehicle (pick first for now)
    const vehicle = await Vehicle.findOne({ ownerId: driverId });
    if (!vehicle) return error(res, 400, 'You must have a registered vehicle to accept ride requests.');

    // Build passenger list
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    const ownerId = request.passengerId.toString();
    if (!groupIds.includes(ownerId)) {
      groupIds = [ownerId, ...groupIds];
    }
    groupIds = [...new Set(groupIds)];

    // Create the offer ride (copy route and stops from request)
    const newOffer = await Ride.create({
      type: 'Offer',
      state: 'Active',
      driverId,
      vehicleId: vehicle._id,
      departureLocation: request.departureLocation,
      destination: request.destination,
      departureDateTime: request.departureDateTime,
      pricePerSeat: request.maxPrice || request.pricePerSeat,
      totalSeats: request.passengerCount || groupIds.length,
      availableSeats: (request.passengerCount || groupIds.length) - groupIds.length,
      genderPreference: request.genderPreference || 'All',
      notes: request.notes,
      stops: request.stops || [],
      route: request.route || null,
    });

    // Create embedded bookings for each passenger
    const bookingDocs = groupIds.map(pid => ({
      passengerId: pid,
      status: 'Confirmed',
      price: request.maxPrice || request.pricePerSeat,
    }));
    await Ride.findByIdAndUpdate(newOffer._id, {
      $push: { bookings: { $each: bookingDocs } },
    });

    if (groupIds.length > 1) {
      // Group request: notify each member
      await Promise.all(groupIds.map(async (userId) => {
        await Notification.create({
          userId,
          title: 'Ride Request Accepted',
          content: `Your group ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
          type: 'Alert',
        });
      }));

      // Send welcome message in the group channel
      const driver = await User.findById(driverId).select('firstName lastName');
      const driverName = `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim();
      const memberUsers = await User.find({ _id: { $in: groupIds } }).select('firstName lastName');
      const memberNames = memberUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ');
      await Message.create({
        senderId: driverId,
        groupRideId: newOffer._id,
        content: `${driverName} accepted the group ride request to ${request.destination}.\n\nGroup members: ${memberNames}\nDriver: ${driverName}\n\nUse this channel to coordinate your trip!`,
      });
    } else {
      // Solo request
      await Notification.create({
        userId: request.passengerId,
        title: 'Ride Request Accepted',
        content: `Your ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
        type: 'Alert',
      });
      await Message.create({
        senderId: driverId,
        receiverId: request.passengerId,
        rideId: newOffer._id,
        content: `Hi! I have accepted your ride request to ${request.destination}. See you soon!`,
      });
    }

    // Mark request as accepted and link the offer ride
    await Ride.findByIdAndUpdate(requestId, {
      $set: { state: 'Accepted', acceptedRideId: newOffer._id },
    });

    return success(res, 200, 'Ride request accepted, ride created, and booking confirmed.', { ride: newOffer });
  } catch (err) {
    next(err);
  }
};

// Dismiss a ride request for a driver (hide it from their view only)
const dismissRideRequest = async (req, res, next) => {
  try {
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

const postRideRequest = async (req, res, next) => {
  try {
    const {
      departureLocation, destination, travelDateTime,
      passengerCount, maxPrice, notes, groupPassengerIds, stops, selectedRoute
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
      let groupIds = groupPassengerIds.map(id => id.toString());
      const ownerId = req.user._id.toString();
      if (!groupIds.includes(ownerId)) groupIds = [ownerId, ...groupIds];
      const users = await User.find({ _id: { $in: groupIds } });
      if (users.length !== groupIds.length) {
        return error(res, 400, 'One or more selected users do not exist.');
      }
      const existing = await Ride.findOne({
        type: 'Request',
        passengerId: { $in: groupIds },
        departureLocation,
        destination,
        departureDateTime: travelDateTime,
        state: 'Open',
      });
      if (existing) {
        return error(res, 409, 'One or more users already have an open request for this ride/time.');
      }
      const request = await Ride.create({
        type: 'Request',
        state: 'Open',
        passengerId: req.user._id,
        departureLocation, destination,
        departureDateTime: travelDateTime,
        passengerCount: groupIds.length,
        pricePerSeat: maxPrice,
        maxPrice,
        notes: notes || '',
        groupPassengerIds: groupIds,
        stops: stops || [],
        ...(selectedRoute && selectedRoute.polyline ? {
          route: {
            originLatitude: selectedRoute.originLat,
            originLongitude: selectedRoute.originLng,
            destinationLatitude: selectedRoute.destLat,
            destinationLongitude: selectedRoute.destLng,
            distanceKM: selectedRoute.distanceKM,
            durationMinutes: selectedRoute.durationMinutes,
            polyline: selectedRoute.polyline,
            summary: selectedRoute.summary || null,
          }
        } : {}),
      });
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

    // Single request
    if (parseInt(passengerCount, 10) !== 1) {
      return error(res, 400, 'You can only request one seat unless making a group request.');
    }
    const existing = await Ride.findOne({
      type: 'Request',
      passengerId: req.user._id,
      departureLocation,
      destination,
      departureDateTime: travelDateTime,
      state: 'Open',
    });
    if (existing) {
      return error(res, 409, 'You already have an open ride request for this ride/time.');
    }
    const request = await Ride.create({
      type: 'Request',
      state: 'Open',
      passengerId: req.user._id,
      departureLocation, destination,
      departureDateTime: travelDateTime,
      passengerCount: 1,
      pricePerSeat: maxPrice,
      maxPrice,
      notes: notes || '',
      stops: stops || [],
      ...(selectedRoute && selectedRoute.polyline ? {
        route: {
          originLatitude: selectedRoute.originLat,
          originLongitude: selectedRoute.originLng,
          destinationLatitude: selectedRoute.destLat,
          destinationLongitude: selectedRoute.destLng,
          distanceKM: selectedRoute.distanceKM,
          durationMinutes: selectedRoute.durationMinutes,
          polyline: selectedRoute.polyline,
          summary: selectedRoute.summary || null,
        }
      } : {}),
    });
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
    const request = await Ride.findOne({ _id: requestId, type: 'Request' });
    if (!request) return error(res, 404, 'Ride request not found.');
    if (request.state !== 'Open') return error(res, 400, 'Can only leave pending requests.');
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    if (!groupIds.includes(userId)) return error(res, 403, 'You are not a member of this group request.');

    // Track leave count
    let leftMembers = request.leftMembers || {};
    if (typeof leftMembers.get === 'function') {
      leftMembers = Object.fromEntries(request.leftMembers.entries());
    }
    leftMembers[userId] = (leftMembers[userId] || 0) + 1;
    request.leftMembers = leftMembers;

    const leavingUser = await User.findById(userId);
    const leavingUserName = leavingUser ? `${leavingUser.firstName} ${leavingUser.lastName}` : 'A member';

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
        await Ride.findByIdAndDelete(requestId);
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
    const request = await Ride.findOne({ _id: req.params.requestId, type: 'Request' });
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the user who created the request can edit it.');
    }

    if (request.state !== 'Open') {
      return error(res, 400, 'Can only modify open requests.');
    }

    if (req.body.travelDateTime) {
      const now = new Date();
      const newTime = new Date(req.body.travelDateTime);
      const minTimeFromNow = 60 * 60 * 1000;

      if (newTime <= now) {
        return error(res, 400, 'Travel time cannot be in the past.');
      }
      if (newTime - now < minTimeFromNow) {
        return error(res, 400, 'Travel time must be at least 1 hour from now.');
      }
    }

    // Handle re-adding left members
    if (req.body.groupPassengerIds) {
      let leftMembers = request.leftMembers || {};
      if (typeof leftMembers.get === 'function') {
        leftMembers = Object.fromEntries(request.leftMembers.entries());
      }
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
      'passengerCount', 'maxPrice', 'notes', 'groupPassengerIds',
      'stops',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'travelDateTime') {
          updates.departureDateTime = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // Handle route update when selectedRoute is provided
    if (req.body.selectedRoute && req.body.selectedRoute.polyline) {
      const sr = req.body.selectedRoute;
      updates.route = {
        originLatitude: sr.originLat,
        originLongitude: sr.originLng,
        destinationLatitude: sr.destLat,
        destinationLongitude: sr.destLng,
        distanceKM: sr.distanceKM,
        durationMinutes: sr.durationMinutes,
        polyline: sr.polyline,
        summary: sr.summary || null,
      };
    }

    const updated = await Ride.findByIdAndUpdate(
      req.params.requestId,
      { $set: updates },
      { new: true, runValidators: true }
    );

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
    const request = await Ride.findOne({ _id: req.params.requestId, type: 'Request' });
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the user who created the request can delete it.');
    }
    const groupIds = (request.groupPassengerIds || []).map(id => id.toString()).filter(id => id !== req.user._id.toString());
    if (groupIds.length > 0) {
      return error(res, 403, 'You must transfer ownership or leave the group before deleting. Use the leave endpoint.');
    }
    await Ride.findByIdAndDelete(req.params.requestId);
    return success(res, 200, 'Ride request deleted.');
  } catch (err) {
    next(err);
  }
};

// Cancel entire group ride request (owner only)
const cancelGroupRideRequest = async (req, res, next) => {
  try {
    const request = await Ride.findOne({ _id: req.params.requestId, type: 'Request' });
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.passengerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Only the request owner can cancel it.');
    }

    const allMemberIds = [request.passengerId, ...(request.groupPassengerIds || [])];
    const owner = await User.findById(request.passengerId);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Someone';

    await Ride.findByIdAndDelete(req.params.requestId);

    if (allMemberIds.length > 1) {
      const otherMembers = allMemberIds.filter(id => id.toString() !== req.user._id.toString());
      
      for (const memberId of otherMembers) {
        await Notification.create({
          userId: memberId,
          title: 'Ride Request Cancelled',
          content: `${ownerName} cancelled the group ride request to ${request.destination} on ${new Date(request.departureDateTime).toLocaleDateString()}.`,
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

    const filter = { type: 'Request', state: 'Open' };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.departureDateTime = { $gte: start, $lte: end };
    }

    // Exclude requests dismissed by the current driver
    const user = await User.findById(req.user._id);
    if (user && user.dismissedRideRequests && user.dismissedRideRequests.length > 0) {
      filter._id = { $nin: user.dismissedRideRequests };
    }

    // Exclude requests where the current user is the passenger or in groupPassengerIds
    filter.$and = [
      { passengerId: { $ne: req.user._id } },
      { groupPassengerIds: { $not: { $elemMatch: { $eq: req.user._id } } } },
    ];

    const sortField = sortBy === 'passengers' ? 'passengerCount' : 'departureDateTime';
    const sortOrder = order === 'asc' ? 1 : -1;

    const requests = await Ride.find(filter)
      .populate('passengerId', 'firstName lastName averageRating')
      .sort({ [sortField]: sortOrder });

    return success(res, 200, `${requests.length} request(s) found.`, { requests });
  } catch (err) {
    next(err);
  }
};

const getMyRideRequests = async (req, res, next) => {
  try {
    const requests = await Ride.find({
      type: 'Request',
      $or: [
        { passengerId: req.user._id },
        { groupPassengerIds: { $in: [req.user._id] } },
      ],
    }).sort({ createdAt: -1 });
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