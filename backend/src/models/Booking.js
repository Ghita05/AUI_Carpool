const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger ID is required'],
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // null for individual bookings
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'Confirmed',
    },
    seatsCount: {
      type: Number,
      required: [true, 'Number of seats is required'],
      min: [1, 'Must book at least 1 seat'],
    },
    luggageDeclaration: {
      type: String,
      default: '',
    },
    pickupLocation: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    requestedStop: {
      type: String,
      default: null,
      trim: true,
    },
    stopStatus: {
      type: String,
      enum: {
        values: ['Pending', 'Accepted', 'Rejected'],
        message: '{VALUE} is not a valid stop status',
      },
      default: null, // null if no stop requested
    },
    stopDecisionDate: {
      type: Date,
      default: null,
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ rideId: 1, passengerId: 1 });
bookingSchema.index({ passengerId: 1, date: -1 });
bookingSchema.index({ rideId: 1, status: 1 });
bookingSchema.index({ groupId: 1 });
bookingSchema.index({ rideId: 1, stopStatus: 1 }); // For finding pending stop requests for a ride

module.exports = mongoose.model('Booking', bookingSchema);
