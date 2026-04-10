const mongoose = require('mongoose');

// ── Embedded sub-document: Route (Table 6) ──
const routeSchema = new mongoose.Schema(
  {
    originLatitude: { type: Number },
    originLongitude: { type: Number },
    destinationLatitude: { type: Number },
    destinationLongitude: { type: Number },
    distanceKM: { type: Number },
    durationMinutes: { type: Number },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver ID is required'],
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
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
    stops: {
      type: [String],
      default: [],
    },
    departureDateTime: {
      type: Date,
      required: [true, 'Departure date and time is required'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Must offer at least 1 seat'],
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats is required'],
      min: [0, 'Available seats cannot be negative'],
    },
    pricePerSeat: {
      type: Number,
      required: [true, 'Price per seat is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Active', 'Full', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid ride status',
      },
      default: 'Active',
    },
    genderPreference: {
      type: String,
      enum: {
        values: ['Women-Only', 'All'],
        message: '{VALUE} is not a valid gender preference',
      },
      default: 'All',
    },
    creationDate: {
      type: Date,
      default: Date.now,
    },
    route: {
      type: routeSchema,
      default: null,
    },
    timeChangeCount: {
      type: Number,
      default: 0,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes optimized for the search/sort/filter functions in Table 14 ──
rideSchema.index({ destination: 'text', departureLocation: 'text' });
rideSchema.index({ departureDateTime: 1 });
rideSchema.index({ status: 1, departureDateTime: 1 });
rideSchema.index({ driverId: 1 });
rideSchema.index({ pricePerSeat: 1 });
rideSchema.index({ availableSeats: -1 });

module.exports = mongoose.model('Ride', rideSchema);
