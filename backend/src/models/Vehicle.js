const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    brand: {
      type: String,
      required: [true, 'Vehicle brand is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true,
    },
    licensePlate: {
      type: String,
      required: [true, 'License plate is required'],
      trim: true,
      uppercase: true,
    },
    registrationCardImage: {
      type: String, // URL to uploaded carte grise
      default: null,
    },
    registrationCardVerified: {
      type: Boolean,
      default: false,
    },
    sizeCategory: {
      type: String,
      enum: {
        values: ['Small', 'Medium', 'Large'],
        message: '{VALUE} is not a valid size category',
      },
      required: [true, 'Size category is required'],
    },
    luggageCapacity: {
      type: Number,
      required: [true, 'Luggage capacity is required'],
      min: [0, 'Luggage capacity cannot be negative'],
    },
    year: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
    },
    smokingPolicy: {
      type: String,
      enum: {
        values: ['Allowed', 'Not Allowed'],
        message: '{VALUE} is not a valid smoking policy',
      },
      required: [true, 'Smoking policy is required'],
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ ownerId: 1 });
vehicleSchema.index({ licensePlate: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
