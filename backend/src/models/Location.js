const mongoose = require('mongoose');
const { Schema } = mongoose;

const locationSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  latitude:  { type: Number, default: null },
  longitude: { type: Number, default: null },
}, { timestamps: true });

locationSchema.index({ name: 1 });

module.exports = mongoose.model('Location', locationSchema);
