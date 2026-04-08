const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Subject ID is required'],
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One review per author per ride per subject
reviewSchema.index({ authorId: 1, subjectId: 1, rideId: 1 }, { unique: true });
reviewSchema.index({ subjectId: 1, date: -1 });
reviewSchema.index({ subjectId: 1, rating: -1 });
reviewSchema.index({ rideId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
