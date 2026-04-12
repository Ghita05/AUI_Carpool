const express = require('express');
const router = express.Router();
const message = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.get('/conversations', authenticate, message.getConversations);
router.get('/channels', authenticate, message.getChannels);
router.get('/channels/:rideId', authenticate, message.getChannelMessages);
router.post('/channels/:rideId', authenticate, message.sendChannelMessage);
router.get('/search', authenticate, message.searchMessages);
router.get('/:otherUserId', authenticate, message.getMessageHistory);
router.post('/', authenticate, message.sendMessage);
router.delete('/conversation/:otherUserId', authenticate, message.deleteConversation);

module.exports = router;
