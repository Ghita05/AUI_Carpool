const { RideRequest, Notification } = require('../models');
const { success, error } = require('../utils/responses');

const postRideRequest = async (req, res, next) => {
  try {
    const {
      departureLocation, destination, travelDateTime,
      passengerCount, maxPrice, notes,
    } = req.body;

    const request = await RideRequest.create({
      passengerId: req.user._id,
      departureLocation, destination, travelDateTime,
      passengerCount, maxPrice, notes: notes || '',
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

const acceptRideRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { rideId } = req.body;

    const request = await RideRequest.findById(requestId);
    if (!request) return error(res, 404, 'Ride request not found.');

    if (request.status !== 'Open') {
      return error(res, 400, 'This request is no longer available.');
    }

    if (request.passengerId.toString() === req.user._id.toString()) {
      return error(res, 400, 'You cannot accept your own ride request.');
    }

    request.status = 'Accepted';
    request.acceptedRideId = rideId;
    await request.save({ validateModifiedOnly: true });

    await Notification.create({
      userId: request.passengerId,
      title: 'Ride Request Accepted',
      content: `A driver has accepted your ride request to ${request.destination}. Check available rides to book.`,
      type: 'Alert',
    });

    return success(res, 200, 'Ride request accepted.');
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
  getRideRequests,
  getMyRideRequests,
};