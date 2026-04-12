const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    groupRideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
    action: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Conversation queries: all messages between two users
messageSchema.index({ senderId: 1, receiverId: 1, date: -1 });
messageSchema.index({ groupRideId: 1, date: -1 });
messageSchema.index({ receiverId: 1, readStatus: 1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);
