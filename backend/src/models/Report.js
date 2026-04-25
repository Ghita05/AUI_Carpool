const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Subject is required'],
    },
    // 'Ride' — filed after a completed ride; 'Message' — filed from a conversation
    context: {
      type: String,
      enum: ['Ride', 'Message'],
      required: true,
    },
    // Populated only for Ride reports
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    // Snapshot of the specific message the reporter attached (Message context)
    messageSnapshot: {
      messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
      content:   { type: String, default: null },
      sentAt:    { type: Date,   default: null },
    },
    category: {
      type: String,
      enum: ['Harassment', 'Inappropriate Behavior', 'Dangerous Driving', 'Fraud or Scam', 'Spam', 'Other'],
      required: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['Open', 'Reviewed', 'Resolved'],
      default: 'Open',
    },
    adminNote: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ subjectId: 1 });
reportSchema.index({ reporterId: 1 });

module.exports = mongoose.model('Report', reportSchema);
