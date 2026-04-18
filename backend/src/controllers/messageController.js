const { Message, User, Ride } = require('../models');
const { success, error } = require('../utils/responses');

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, rideId = null, content } = req.body;

    if (!content || !content.trim()) {
      return error(res, 400, 'Message content is required.');
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return error(res, 404, 'Recipient not found.');

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      rideId,
      content: content.trim(),
    });

    return success(res, 201, 'Message sent.', { messageId: message._id, message });
  } catch (err) {
    next(err);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          groupRideId: null,
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      { $sort: { date: -1 } },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ['$senderId', userId] },
              then: '$receiverId',
              else: '$senderId',
            },
          },
        },
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$content' },
          lastDate: { $first: '$date' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$readStatus', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastDate: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser',
        },
      },
      { $unwind: '$otherUser' },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          lastDate: 1,
          unreadCount: 1,
          'otherUser.firstName': 1,
          'otherUser.lastName': 1,
          'otherUser.profilePicture': 1,
        },
      },
    ]);

    return success(res, 200, `${conversations.length} conversation(s).`, { conversations });
  } catch (err) {
    next(err);
  }
};

const getMessageHistory = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ date: 1 });

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, readStatus: false },
      { $set: { readStatus: true } }
    );

    return success(res, 200, `${messages.length} message(s).`, { messages });
  } catch (err) {
    next(err);
  }
};

const searchMessages = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) return error(res, 400, 'Search query is required.');

    const messages = await Message.find({
      $and: [
        { $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] },
        { content: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('senderId', 'firstName lastName')
      .populate('receiverId', 'firstName lastName')
      .sort({ date: -1 })
      .limit(50);

    return success(res, 200, `${messages.length} message(s) found.`, { messages });
  } catch (err) {
    next(err);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user._id;

    await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    });

    return success(res, 200, 'Conversation deleted.');
  } catch (err) {
    next(err);
  }
};

// Helper: check if user is driver or has a confirmed booking for a ride
const isRideMember = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { member: false, ride: null };
  if (ride.driverId.toString() === userId.toString()) return { member: true, ride };
  const hasBooking = (ride.bookings || []).some(
    b => b.passengerId.toString() === userId.toString() && b.status === 'Confirmed'
  );
  return { member: hasBooking, ride };
};

const getChannels = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find rides where user is driver
    const driverRides = await Ride.find({ driverId: userId, state: { $nin: ['Cancelled'] } }).select('_id');
    // Find rides where user has a confirmed embedded booking
    const passengerRides = await Ride.find({
      'bookings.passengerId': userId,
      'bookings.status': 'Confirmed',
    }).select('_id');

    const rideIds = [
      ...driverRides.map(r => r._id),
      ...passengerRides.map(r => r._id),
    ];

    // Only rides that actually have group messages
    const groupRideIds = await Message.distinct('groupRideId', {
      groupRideId: { $in: rideIds, $ne: null },
    });

    // Build channel info for each
    const channels = await Promise.all(groupRideIds.map(async (rideId) => {
      const ride = await Ride.findById(rideId).select('destination driverId bookings');
      const confirmedBookings = (ride.bookings || []).filter(b => b.status === 'Confirmed');
      const memberIds = [ride.driverId, ...confirmedBookings.map(b => b.passengerId)];
      const members = await User.find({ _id: { $in: memberIds } }).select('firstName lastName profilePicture');
      const lastMsg = await Message.findOne({ groupRideId: rideId })
        .sort({ date: -1 })
        .populate('senderId', 'firstName lastName');
      return {
        _id: rideId.toString(),
        name: ride.destination,
        rideId,
        members,
        lastMessage: lastMsg?.content || '',
        lastDate: lastMsg?.date || null,
        lastSender: lastMsg?.senderId || null,
      };
    }));

    channels.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
    return success(res, 200, `${channels.length} channel(s).`, { channels });
  } catch (err) {
    next(err);
  }
};

const getChannelMessages = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const userId = req.user._id;

    const { member } = await isRideMember(rideId, userId);
    if (!member) return error(res, 403, 'You are not a member of this channel.');

    const messages = await Message.find({ groupRideId: rideId })
      .populate('senderId', 'firstName lastName')
      .sort({ date: 1 });

    return success(res, 200, `${messages.length} message(s).`, { messages });
  } catch (err) {
    next(err);
  }
};

const sendChannelMessage = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return error(res, 400, 'Message content is required.');
    }

    const { member } = await isRideMember(rideId, userId);
    if (!member) return error(res, 403, 'You are not a member of this channel.');

    const message = await Message.create({
      senderId: userId,
      groupRideId: rideId,
      content: content.trim(),
    });

    return success(res, 201, 'Message sent.', { messageId: message._id, message });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessageHistory,
  searchMessages,
  deleteConversation,
  getChannels,
  getChannelMessages,
  sendChannelMessage,
};