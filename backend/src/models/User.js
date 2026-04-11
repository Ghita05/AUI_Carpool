
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: {
    type: String,
    default: '',
    trim: true,
  },
    lastName: {
    type: String,
    default: '',
    trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@aui\.ma$/,
        'Only @aui.ma email addresses are allowed',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    cashWalletImage: {
      type: String, // URL to uploaded CashWallet photo
      default: null,
    },
    auiId: {
      type: String,
      default: '',
      trim: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ['Passenger', 'Driver', 'Admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'Passenger',
    },
    verificationStatus: {
      type: Boolean,
      default: false,
    },
    smokingPreference: {
      type: String,
      enum: ['Non-smoker', 'Smoker', 'No preference'],
      default: 'No preference',
    },
    drivingStyle: {
      type: String,
      enum: ['Calm', 'Moderate', 'Fast', ''],
      default: '',
    },
    // Dismissed ride requests (for drivers)
    dismissedRideRequests: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    // ── Computed fields (updated by their owning services) ──
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalCompletedRides: {
      type: Number,
      default: 0,
    },
    cancellationCount: {
      type: Number,
      default: 0,
    },
    accountStatus: {
      type: String,
      enum: ['Active', 'Suspended', 'Deactivated'],
      default: 'Active',
    },
    // ── Driver-specific fields ──
    driverLicenseImage: {
      type: String,
      default: null,
    },
    driverLicenseVerified: {
      type: Boolean,
      default: false,
    },
    reviewSummary: {
      type: String,
      default: '',
    },
    // ── Auth tokens ──
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
// Note: email already has unique:true in the schema, so no separate index needed for it
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
userSchema.index({ averageRating: -1 });
userSchema.index({ registrationDate: -1 });

// ── Pre-save: hash password ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare password ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: return safe user object (no sensitive fields) ──
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
