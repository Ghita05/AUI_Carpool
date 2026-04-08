const { Message, User } = require('../models');
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

module.exports = {
  sendMessage,
  getConversations,
  getMessageHistory,
  searchMessages,
  deleteConversation,
};