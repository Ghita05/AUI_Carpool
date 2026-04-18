const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Route sub-document ────────────────────────────────────────────────────
const routeSchema = new Schema({
  originLatitude:       { type: Number },
  originLongitude:      { type: Number },
  destinationLatitude:  { type: Number },
  destinationLongitude: { type: Number },
  distanceKM:           { type: Number },
  durationMinutes:      { type: Number },
  polyline:             { type: String, default: null },
  summary:              { type: String, default: null },
}, { _id: false });

// ── Booking sub-document (embedded in Offer documents) ───────────────────
const bookingSubSchema = new Schema({
  passengerId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:            { type: Schema.Types.ObjectId, default: null },
  status:             {
    type: String,
    enum: ['Confirmed', 'Cancelled', 'Completed'],
    default: 'Confirmed',
  },
  pickupLocation:     { type: String, default: '' },
  luggageDeclaration: { type: String, default: '' },
  price:              { type: Number, default: 0 },
  attendanceStatus:   {
    type: String,
    enum: ['Present', 'Absent'],
    default: null,
  },
  cancellationReason: { type: String, default: null },
  cancellationDate:   { type: Date, default: null },
  report: {
    category:    { type: String, default: null },
    description: { type: String, default: null },
    status:      {
      type: String,
      enum: ['Open', 'Resolved', 'Closed'],
      default: null,
    },
    adminNote:   { type: String, default: null },
    createdAt:   { type: Date, default: null },
    resolvedAt:  { type: Date, default: null },
  },
  bookedAt: { type: Date, default: Date.now },
}, { _id: true, timestamps: false });

// ── Unified Ride schema ───────────────────────────────────────────────────
const rideSchema = new Schema({

  type: {
    type: String,
    enum: ['Offer', 'Request'],
    required: [true, 'Ride type is required'],
  },

  state: {
    type: String,
    enum: ['Open', 'Active', 'Full', 'Accepted', 'OnGoing', 'Completed', 'Cancelled', 'Expired'],
    default: null,
  },

  // ── Live-ride flags (set by GPS-driven socket logic) ──────────────────
  // Tracks how many departure-window alerts have been sent (allows repeated alerts).
  departureAlertsSent:  { type: Number, default: 0 },
  // Set when the ride transitions OnGoing → Completed via GPS, prevents
  // duplicate review prompts if the driver also manually completes the ride.
  reviewsPrompted:      { type: Boolean, default: false },
  // Timestamp when the ride transitioned to OnGoing — used to estimate ETA.
  ongoingStartedAt:     { type: Date, default: null },
  // Set when absent passengers have been auto-cancelled upon ride going OnGoing.
  absentPassengersCancelled: { type: Boolean, default: false },



  // ── Shared fields ─────────────────────────────────────────────────────
  departureLocation: { type: String, required: true, trim: true },
  destination:       { type: String, required: true, trim: true },
  departureDateTime: { type: Date, required: true },
  pricePerSeat:      { type: Number, required: true, min: 0 },
  genderPreference:  {
    type: String,
    enum: ['Women-Only', 'All'],
    default: 'All',
  },
  notes: { type: String, default: '' },

  // ── Offer-only fields ─────────────────────────────────────────────────
  driverId:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
  vehicleId:       { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  totalSeats:      { type: Number, min: 1, default: null },
  availableSeats:  { type: Number, min: 0, default: null },
  timeChangeCount: { type: Number, default: 0 },
  route:           { type: routeSchema, default: null },
  bookings:        { type: [bookingSubSchema], default: [] },

  // ── Stops (used by both Offer and Request) ────────────────────────────
  stops:             { type: [String], default: [] },

  // ── Request-only fields ───────────────────────────────────────────────
  passengerId:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  groupPassengerIds: { type: [Schema.Types.ObjectId], default: [] },
  leftMembers:       { type: Map, of: Number, default: {} },
  passengerCount:    { type: Number, min: 1, default: null },
  maxPrice:          { type: Number, default: null },
  acceptedRideId:    { type: Schema.Types.ObjectId, ref: 'Ride', default: null },

  // ── Cancellation (both types) ─────────────────────────────────────────
  cancellationReason: { type: String, default: null },
  cancellationDate:   { type: Date, default: null },

}, { timestamps: true });

// ── Pre-save: set default state based on type ─────────────────────────────
rideSchema.pre('save', function(next) {
  if (this.isNew && this.state === null) {
    this.state = this.type === 'Offer' ? 'Active' : 'Open';
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────
rideSchema.index({ type: 1, state: 1, departureDateTime: 1 });
rideSchema.index({ driverId: 1, type: 1 });
rideSchema.index({ passengerId: 1, type: 1 });
rideSchema.index({ 'bookings.passengerId': 1 });
rideSchema.index({ 'bookings._id': 1 });
rideSchema.index({ destination: 'text', departureLocation: 'text' });

rideSchema.index({ pricePerSeat: 1 });
rideSchema.index({ availableSeats: -1 });

module.exports = mongoose.model('Ride', rideSchema);
