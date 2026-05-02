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

const { Ride, Notification, User, Vehicle, Message, Route } = require('../models');
const { success, error } = require('../utils/responses');

// Persists a Route document from raw route data.
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

// Accept a ride request: create an offer ride for the driver, embed booking(s) for passenger(s), notify, mark request as accepted
const acceptRideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const driverId = req.user._id;

    const request = await Ride.findOne({ _id: requestId, type: 'Request' })
      .populate('route');
    if (!request) return error(res, 404, 'Ride request not found.');
    if (request.state !== 'Open') return error(res, 400, 'This request is no longer available.');
    if (request.passengerId.toString() === driverId.toString()) return error(res, 400, 'You cannot accept your own ride request.');

    // Find driver's vehicle
    const vehicle = await Vehicle.findOne({ ownerId: driverId });
    if (!vehicle) return error(res, 400, 'You must have a registered vehicle to accept ride requests.');

    // Build passenger list
    let groupIds = (request.groupPassengerIds || []).map(id => id.toString());
    const ownerId = request.passengerId.toString();
    if (!groupIds.includes(ownerId)) {
      groupIds = [ownerId, ...groupIds];
    }
    groupIds = [...new Set(groupIds)];

    // Hard block: seat capacity
    const requestedSeats = request.passengerCount || groupIds.length;
    if (requestedSeats > vehicle.totalSeats) {
      return error(res, 400,
        `This request needs ${requestedSeats} seat(s) but your vehicle only has ${vehicle.totalSeats}. You cannot accept this request.`
      );
    }

    // Soft check: luggage capacity
    const LUGGAGE_WEIGHT = { None: 0, Small: 1, Medium: 2, Large: 3 };
    const luggageScore = LUGGAGE_WEIGHT[request.luggageDeclaration] || 0;
    const luggageWarning = luggageScore > 0 && luggageScore > (vehicle.luggageCapacity || 0)
      ? {
          declared: request.luggageDeclaration,
          vehicleCapacity: vehicle.luggageCapacity,
          message: `Passenger declared ${request.luggageDeclaration} luggage but your vehicle capacity is ${vehicle.luggageCapacity}. It is your responsibility to make the necessary arrangements.`,
        }
      : null;

    // Create the offer ride (copy route and stops from request)
    const vehicleTotalSeats = vehicle.totalSeats || 5;
    const newOffer = await Ride.create({
      type: 'Offer',
      state: 'Active',
      driverId,
      vehicleId: vehicle._id,
      departureLocation: request.departureLocation,
      destination: request.destination,
      departureDateTime: request.departureDateTime,
      pricePerSeat: request.maxPrice || request.pricePerSeat,
      totalSeats: vehicleTotalSeats,
      availableSeats: vehicleTotalSeats - groupIds.length,
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
      luggageDeclaration: request.luggageDeclaration || 'None',
    }));
    await Ride.findByIdAndUpdate(newOffer._id, {
      $push: { bookings: { $each: bookingDocs } },
    });

    if (groupIds.length > 1) {
      await Promise.all(groupIds.map(async (userId) => {
        await Notification.create({
          userId,
          title: 'Ride Request Accepted',
          content: `Your group ride request to ${request.destination} was accepted. A ride has been created and you have been booked.`,
          type: 'Alert',
        });
      }));

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

    // Find identical pending requests for potential merge
    // "Identical" = same dep, dest, date (same minute), stops array, state Open
    const depTime = new Date(request.departureDateTime);
    const windowStart = new Date(depTime.getTime() - 60000);
    const windowEnd   = new Date(depTime.getTime() + 60000);

    const mergeCandidates = await Ride.find({
      _id:               { $ne: requestId },
      type:              'Request',
      state:             'Open',
      departureLocation: request.departureLocation,
      destination:       request.destination,
      departureDateTime: { $gte: windowStart, $lte: windowEnd },
    })
      .populate('passengerId', 'firstName lastName profilePicture averageRating')
      .lean();

    // Filter to same stops (order-insensitive)
    const reqStops = [...(request.stops || [])].sort().join('|');
    const filtered = mergeCandidates.filter(c => {
      const cStops = [...(c.stops || [])].sort().join('|');
      return cStops === reqStops;
    });

    return success(res, 200, 'Ride request accepted, ride created, and booking confirmed.', {
      ride: newOffer,
      luggageWarning,
      mergeCandidates: filtered.map(c => ({
        requestId:          c._id,
        passenger:          c.passengerId,
        passengerCount:     c.passengerCount,
        luggageDeclaration: c.luggageDeclaration,
        maxPrice:           c.maxPrice,
        stops:              c.stops,
      })),
    });
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
      passengerCount, maxPrice, notes, groupPassengerIds, stops, selectedRoute,
      luggageDeclaration, genderPreference,
    } = req.body;

    // Gender restriction enforcement for Women-Only requests
    if (genderPreference === 'Women-Only' && req.user.gender !== 'Female') {
      return error(res, 403, 'Only female users can post a Women-Only ride request.');
    }

    // Validate travel time is in the future (at least 30 minutes from now)
    const now = new Date();
    const travelTime = new Date(travelDateTime);
    const minTimeFromNow = 30 * 60 * 1000; // 30 minutes
    if (travelTime <= now) {
      return error(res, 400, 'Travel time cannot be in the past.');
    }
    if (travelTime - now < minTimeFromNow) {
      return error(res, 400, 'Travel time must be at least 30 minutes from now.');
    }

    // If groupPassengerIds is present and is an array, treat as group request
    if (Array.isArray(groupPassengerIds) && groupPassengerIds.length >= 1) {
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
      const routeId = selectedRoute && selectedRoute.polyline
        ? await createRouteDoc({
            originLatitude: selectedRoute.originLat,
            originLongitude: selectedRoute.originLng,
            destinationLatitude: selectedRoute.destLat,
            destinationLongitude: selectedRoute.destLng,
            distanceKM: selectedRoute.distanceKM,
            durationMinutes: selectedRoute.durationMinutes,
            polyline: selectedRoute.polyline,
            summary: selectedRoute.summary || null,
          })
        : null;
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
        route: routeId,
        luggageDeclaration: luggageDeclaration || 'None',
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
    const singleRouteId = selectedRoute && selectedRoute.polyline
      ? await createRouteDoc({
          originLatitude: selectedRoute.originLat,
          originLongitude: selectedRoute.originLng,
          destinationLatitude: selectedRoute.destLat,
          destinationLongitude: selectedRoute.destLng,
          distanceKM: selectedRoute.distanceKM,
          durationMinutes: selectedRoute.durationMinutes,
          polyline: selectedRoute.polyline,
          summary: selectedRoute.summary || null,
        })
      : null;
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
      route: singleRouteId,
      luggageDeclaration: luggageDeclaration || 'None',
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
      const minTimeFromNow = 30 * 60 * 1000;

      if (newTime <= now) {
        return error(res, 400, 'Travel time cannot be in the past.');
      }
      if (newTime - now < minTimeFromNow) {
        return error(res, 400, 'Travel time must be at least 30 minutes from now.');
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
      'stops', 'luggageDeclaration',
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
      if (request.route) {
        await Route.findByIdAndUpdate(request.route, {
          originLatitude: sr.originLat,
          originLongitude: sr.originLng,
          destinationLatitude: sr.destLat,
          destinationLongitude: sr.destLng,
          distanceKM: sr.distanceKM,
          durationMinutes: sr.durationMinutes,
          polyline: sr.polyline,
          summary: sr.summary || null,
        });
      } else {
        updates.route = await createRouteDoc({
          originLatitude: sr.originLat,
          originLongitude: sr.originLng,
          destinationLatitude: sr.destLat,
          destinationLongitude: sr.destLng,
          distanceKM: sr.distanceKM,
          durationMinutes: sr.durationMinutes,
          polyline: sr.polyline,
          summary: sr.summary || null,
        });
      }
    }

    const updated = await Ride.findByIdAndUpdate(
      req.params.requestId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('route');

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


// Merge identical open requests into an existing offer ride
const mergeRideRequests = async (req, res, next) => {
  try {
    const driverId = req.user._id;
    const { offerRideId, requestIds } = req.body;

    if (!offerRideId || !Array.isArray(requestIds) || requestIds.length === 0) {
      return error(res, 400, 'offerRideId and a non-empty requestIds array are required.');
    }

    // Load offer and verify ownership
    const offer = await Ride.findOne({ _id: offerRideId, type: 'Offer', driverId });
    if (!offer) return error(res, 404, 'Offer ride not found or you do not own it.');
    if (offer.state !== 'Active') return error(res, 400, 'Offer ride is no longer active.');

    const vehicle = await Vehicle.findById(offer.vehicleId);
    if (!vehicle) return error(res, 400, 'Vehicle linked to this offer not found.');

    // Load all candidate requests
    const requests = await Ride.find({
      _id: { $in: requestIds },
      type: 'Request',
      state: 'Open',
    }).populate('passengerId', 'firstName lastName');

    if (requests.length !== requestIds.length) {
      return error(res, 400, 'One or more requests are no longer open or do not exist.');
    }

    // Total new passengers needed
    const totalNewPassengers = requests.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
    if (totalNewPassengers > offer.availableSeats) {
      return error(res, 400,
        `Merging these requests requires ${totalNewPassengers} seat(s) but only ${offer.availableSeats} are available.`
      );
    }

    // Soft luggage warnings
    const LUGGAGE_WEIGHT = { None: 0, Small: 1, Medium: 2, Large: 3 };
    const luggageWarnings = requests
      .filter(r => {
        const score = LUGGAGE_WEIGHT[r.luggageDeclaration] || 0;
        return score > 0 && score > (vehicle.luggageCapacity || 0);
      })
      .map(r => ({
        requestId: r._id,
        passengerName: `${r.passengerId?.firstName || ''} ${r.passengerId?.lastName || ''}`.trim(),
        declared: r.luggageDeclaration,
        vehicleCapacity: vehicle.luggageCapacity,
      }));

    // Add bookings + update availableSeats + mark requests Accepted
    const bookingDocs = [];
    for (const r of requests) {
      const passengers = [...(r.groupPassengerIds || []).map(id => id.toString())];
      const ownerId = r.passengerId?._id?.toString() || r.passengerId?.toString();
      if (ownerId && !passengers.includes(ownerId)) passengers.unshift(ownerId);

      for (const pid of [...new Set(passengers)]) {
        bookingDocs.push({
          passengerId: pid,
          status: 'Confirmed',
          price: r.maxPrice || offer.pricePerSeat,
          luggageDeclaration: r.luggageDeclaration || 'None',
        });
      }
    }

    await Ride.findByIdAndUpdate(offerRideId, {
      $push: { bookings: { $each: bookingDocs } },
      $inc: { availableSeats: -totalNewPassengers },
    });

    // Mark each merged request as Accepted
    await Ride.updateMany(
      { _id: { $in: requestIds } },
      { $set: { state: 'Accepted', acceptedRideId: offerRideId } }
    );

    // Notify each passenger
    for (const r of requests) {
      const allPassengers = [...(r.groupPassengerIds || []).map(id => id.toString())];
      const ownerId = r.passengerId?._id?.toString() || r.passengerId?.toString();
      if (ownerId && !allPassengers.includes(ownerId)) allPassengers.unshift(ownerId);

      for (const pid of [...new Set(allPassengers)]) {
        await Notification.create({
          userId: pid,
          title: 'Ride Request Accepted',
          content: `Your ride request to ${r.destination} was accepted and merged into an existing ride.`,
          type: 'Alert',
        });
        await Message.create({
          senderId: driverId,
          receiverId: pid,
          rideId: offerRideId,
          content: `Hi! I have accepted your ride request to ${r.destination} and added you to my existing ride. See you soon!`,
        });
      }
    }

    const updatedOffer = await Ride.findById(offerRideId);
    return success(res, 200, `${requests.length} request(s) merged successfully.`, {
      ride: updatedOffer,
      luggageWarnings,
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
      .populate('route')
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
    }).populate('route').populate('acceptedRideId', 'driverId').sort({ createdAt: -1 });
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
  mergeRideRequests,
};