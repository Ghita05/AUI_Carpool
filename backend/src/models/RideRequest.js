
    const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema(
  {
    groupPassengerIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger ID is required'],
    },
    departureLocation: {
      type: String,
      required: [true, 'Departure location is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    travelDateTime: {
      type: Date,
      required: [true, 'Travel date and time is required'],
    },
    passengerCount: {
      type: Number,
      required: [true, 'Passenger count is required'],
      min: [1, 'At least 1 passenger'],
    },
    maxPrice: {
      type: Number,
      required: [true, 'Maximum price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['Open', 'Accepted', 'Expired', 'Cancelled'],
        message: '{VALUE} is not a valid request status',
      },
      default: 'Open',
    },
    creationDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    acceptedRideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

rideRequestSchema.index({ destination: 'text', departureLocation: 'text' });
rideRequestSchema.index({ travelDateTime: 1 });
rideRequestSchema.index({ status: 1 });
rideRequestSchema.index({ passengerId: 1 });

module.exports = mongoose.model('RideRequest', rideRequestSchema);
