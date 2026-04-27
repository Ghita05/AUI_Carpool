// Persists an in-app notification and pushes it to the user's socket room.
// The io argument is optional — notification is always saved to DB regardless.
// Usage: await sendNotification(req.app.get('io'), { userId, title, content, type, rideId });
const { Notification } = require('../models');

async function sendNotification(io, data) {
  const notification = await Notification.create(data);

  if (io && data.userId) {
    io.to(`user:${data.userId.toString()}`).emit('new-notification', {
      notification: notification.toObject(),
    });
  }

  return notification;
}

module.exports = { sendNotification };
