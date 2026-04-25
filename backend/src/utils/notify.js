/**
 * utils/notify.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central helper for persisting an in-app notification AND pushing it via
 * Socket.IO so connected clients receive an immediate popup banner.
 *
 * Usage (in controllers with req.app.get('io')):
 *   await sendNotification(req.app.get('io'), { userId, title, content, type, rideId, metadata });
 *
 * Usage (in socket/index.js where io is already in scope):
 *   await sendNotification(io, { userId, title, content, type });
 *
 * The io argument is optional — if null/undefined the notification is still
 * persisted in the database; the socket push is simply skipped.
 */
const { Notification } = require('../models');

/**
 * @param {import('socket.io').Server|null} io
 * @param {{ userId: string, title: string, content: string, type: string, rideId?: string, metadata?: object }} data
 * @returns {Promise<import('mongoose').Document>}
 */
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
