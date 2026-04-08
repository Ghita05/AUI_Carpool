const { Notification } = require('../models');
const { success, error } = require('../utils/responses');

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments({ userId: req.user._id }),
    ]);

    return success(res, 200, `${notifications.length} notification(s).`, {
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      readStatus: false,
    });
    return success(res, 200, 'Unread count retrieved.', { count });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    if (!notification) return error(res, 404, 'Notification not found.');

    if (notification.userId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'Not your notification.');
    }

    notification.readStatus = true;
    await notification.save({ validateModifiedOnly: true });

    return success(res, 200, 'Notification marked as read.');
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readStatus: false },
      { $set: { readStatus: true } }
    );
    return success(res, 200, 'All notifications marked as read.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};