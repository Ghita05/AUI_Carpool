const express = require('express');
const router = express.Router();
const notification = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, notification.getNotifications);
router.get('/unread-count', authenticate, notification.getUnreadCount);
router.put('/mark-all-read', authenticate, notification.markAllAsRead);
router.put('/:notificationId/read', authenticate, notification.markAsRead);

module.exports = router;
