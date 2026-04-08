const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Notification content is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['Booking', 'Reminder', 'Cancellation', 'Alert', 'System'],
        message: '{VALUE} is not a valid notification type',
      },
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, date: -1 });
notificationSchema.index({ userId: 1, readStatus: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
