const mongoose = require('mongoose');
const { Schema } = mongoose;

const routeSchema = new Schema({
  originLatitude:       { type: Number, required: true },
  originLongitude:      { type: Number, required: true },
  destinationLatitude:  { type: Number, required: true },
  destinationLongitude: { type: Number, required: true },
  distanceKM:           { type: Number },
  durationMinutes:      { type: Number },
  polyline:             { type: String, default: null },
  summary:              { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
