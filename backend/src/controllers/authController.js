const { User } = require('../models');
const { success, error } = require('../utils/responses');
const {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  generateResetToken,
  verifyToken,
} = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
/**
 * POST /api/users/send-verification
 * Step 1 of signup: validates the @aui.ma email, creates a minimal placeholder
 * user (just email), and sends the verification link. No profile data yet.
 */
const sendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@aui\.ma$/i.test(email.trim())) {
      return error(res, 400, 'A valid @aui.ma email is required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if a fully registered account already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing && existing.verificationStatus && existing.firstName) {
      return error(res, 409, 'An account with this email already exists. Please log in.');
    }

    // If a stale placeholder exists (unverified, no profile), delete it and start fresh
    if (existing && !existing.firstName) {
      await User.findByIdAndDelete(existing._id);
    }

    // Create minimal placeholder user — just enough to send verification email
    const tempPassword = require('crypto').randomBytes(32).toString('hex');
    const placeholder = await User.create({
      email: cleanEmail,
      password: tempPassword,
      firstName: '',
      lastName: '',
      phoneNumber: '',
      auiId: '',
    });

    const verificationToken = generateVerificationToken(placeholder._id, cleanEmail);
    await sendVerificationEmail(cleanEmail, verificationToken);

    return success(res, 200, 'Verification link sent.', { email: cleanEmail });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/check-verification?email=...
 * Step 2 polling: the CheckInbox screen calls this to know when the user
 * has clicked the verification link. Returns { verified: true/false }.
 */
const checkVerification = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return error(res, 400, 'Email is required.');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return success(res, 200, 'Status checked.', { verified: false });
    }

    return success(res, 200, 'Status checked.', { verified: user.verificationStatus });
  } catch (err) {
    next(err);
  }
};
/**
 * POST /api/users/register
 * Step 3 of signup: completes the pre-verified placeholder user with full
 * profile data. The email was already verified in Step 2, so the account
 * is immediately active and the user is auto-logged in.
 */
const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, auiId, role } = req.body;

    const cleanEmail = email.trim().toLowerCase();

    // Find the placeholder user created in Step 1
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return error(res, 404, 'No pending registration found for this email. Please start from Step 1.');
    }

    // Check the email was verified (Step 2)
    if (!user.verificationStatus) {
      return error(res, 403, 'Email not yet verified. Please click the link in your inbox first.');
    }

    // Check this isn't already a fully completed account
    if (user.firstName && user.firstName.length > 0) {
      return error(res, 409, 'This account is already complete. Please log in.');
    }

    // Fill in the profile
    user.firstName = firstName;
    user.lastName = lastName;
    user.password = password; // pre-save hook hashes it
    user.phoneNumber = phoneNumber;
    user.auiId = auiId;
    user.role = role || 'Passenger';
    await user.save();

    // Auto-login: generate tokens so the user goes straight to Main
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    return success(res, 201, 'Account created successfully.', {
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  const renderPage = (title, message, isSuccess) => {
    const icon = isSuccess
      ? '<div style="width:64px;height:64px;border-radius:50%;background:#E8F5E9;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="#1B5E20" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg></div>'
      : '<div style="width:64px;height:64px;border-radius:50%;background:#FFEBEE;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="#C62828" stroke-width="2.5" stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg></div>';

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} — AUI Carpool</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0;padding:0;background:#F5F5F5;font-family:'Plus Jakarta Sans',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
        <div style="background:white;border-radius:12px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
          ${icon}
          <h1 style="color:#1B5E20;font-size:22px;margin:0 0 8px;font-weight:700">${title}</h1>
          <p style="color:#555;font-size:15px;line-height:1.5;margin:0 0 24px">${message}</p>
          <p style="color:#999;font-size:12px;margin:0">AUI Carpool — A Peer-to-Peer Ride-Sharing Platform</p>
        </div>
      </body>
      </html>
    `);
  };

  try {
    const { token } = req.query;
    if (!token) {
      return renderPage('Missing Token', 'No verification token was provided. Please use the link from your email.', false);
    }

    const decoded = verifyToken(token, process.env.JWT_VERIFICATION_SECRET);
    if (decoded.purpose !== 'email-verification') {
      return renderPage('Invalid Link', 'This verification link is not valid. Please request a new one from the app.', false);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return renderPage('Account Not Found', 'We could not find an account associated with this link.', false);
    }
    if (user.verificationStatus) {
      return renderPage('Already Verified', 'Your email has already been verified. You can open the app and log in.', true);
    }

    user.verificationStatus = true;
    await user.save();

    return renderPage('Email Verified!', 'Your @aui.ma email has been verified successfully. You can now open the app and log in to your account.', true);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return renderPage('Link Expired', 'This verification link has expired. Please open the app and request a new verification email.', false);
    }
    next(err);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return error(res, 404, 'No account found with this email.');
    }
    if (user.verificationStatus) {
      return success(res, 200, 'Email already verified.');
    }

    const verificationToken = generateVerificationToken(user._id, email);
    await sendVerificationEmail(email, verificationToken);

    return success(res, 200, 'Verification email resent. Check your inbox.');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return error(res, 401, 'Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 401, 'Invalid email or password.');
    }

    if (!user.verificationStatus) {
      return error(res, 403, 'Please verify your @aui.ma email before logging in.');
    }

    if (user.accountStatus !== 'Active') {
      return error(res, 403, `Your account is ${user.accountStatus.toLowerCase()}.`);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    return success(res, 200, 'Login successful.', {
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return success(res, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return error(res, 400, 'Refresh token is required.');
    }

    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return error(res, 401, 'Invalid refresh token. Please log in again.');
    }

    const accessToken = generateAccessToken(user._id, user.role);

    return success(res, 200, 'Token refreshed.', { accessToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 401, 'Refresh token expired. Please log in again.');
    }
    next(err);
  }
};

const recoverPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return success(res, 200, 'If an account exists, a reset link has been sent.');
    }

    const resetToken = generateResetToken(user._id, email);
    await sendPasswordResetEmail(email, resetToken);

    return success(res, 200, 'If an account exists, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = verifyToken(token, process.env.JWT_RESET_SECRET);
    if (decoded.purpose !== 'password-reset') {
      return error(res, 400, 'Invalid reset token.');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return error(res, 404, 'User not found.');
    }

    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    return success(res, 200, 'Password reset successfully. You can now log in.');
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 400, 'Reset link expired. Request a new one.');
    }
    next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.verificationStatus) {
      return error(res, 404, 'User not found.');
    }
    return success(res, 200, 'User profile retrieved.', { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    return success(res, 200, 'Profile retrieved.', { user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { query, searchType = 'name' } = req.query;
    if (!query) {
      return error(res, 400, 'Search query is required.');
    }

    let filter;
    if (searchType === 'email') {
      filter = { email: { $regex: query, $options: 'i' }, verificationStatus: true };
    } else {
      filter = {
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
        ],
        verificationStatus: true,
      };
    }

    const users = await User.find(filter).select('-password -refreshToken -__v').limit(20);
    return success(res, 200, `${users.length} user(s) found.`, { users });
  } catch (err) {
    next(err);
  }
};

const sortUsers = async (req, res, next) => {
  try {
    const { sortBy = 'rating', order = 'desc' } = req.query;

    const sortField =
      sortBy === 'joinDate' ? 'registrationDate' : 'averageRating';
    const sortOrder = order === 'asc' ? 1 : -1;

    const users = await User.find({ accountStatus: 'Active', verificationStatus: true })
      .select('-password -refreshToken -__v')
      .sort({ [sortField]: sortOrder })
      .limit(50);

    return success(res, 200, `${users.length} user(s) retrieved.`, { users });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'profilePicture',
      'smokingPreference', 'drivingStyle',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Profile updated.', { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { smokingPreference, drivingStyle } = req.body;
    const updates = {};

    if (smokingPreference !== undefined) updates.smokingPreference = smokingPreference;
    if (drivingStyle !== undefined) updates.drivingStyle = drivingStyle;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Preferences updated.', { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const deactivateAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      accountStatus: 'Deactivated',
      refreshToken: null,
    });
    return success(res, 200, 'Account deactivated.');
  } catch (err) {
    next(err);
  }
};

const suspendAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return error(res, 404, 'User not found.');
    }

    user.accountStatus = 'Suspended';
    user.refreshToken = null;
    await user.save({ validateModifiedOnly: true });

    return success(res, 200, `Account suspended. Reason: ${reason}`);
  } catch (err) {
    next(err);
  }
};

const issueWarning = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { warningMessage } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return error(res, 404, 'User not found.');
    }

    const { Notification } = require('../models');
    await Notification.create({
      userId,
      title: 'Account Warning',
      content: warningMessage,
      type: 'Alert',
    });

    return success(res, 200, 'Warning issued.');
  } catch (err) {
    next(err);
  }
};

const uploadCashWallet = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 400, 'CashWallet image is required.');
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { cashWalletImage: imageUrl });

    return success(res, 200, 'CashWallet image uploaded.', { imageUrl });
  } catch (err) {
    next(err);
  }
};

const uploadDriverLicense = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 400, 'Driver license image is required.');
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { driverLicenseImage: imageUrl });

    return success(res, 200, 'Driver license image uploaded.', { imageUrl });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendVerification,
  checkVerification,
  registerUser,
  verifyEmail,
  resendVerification,
  login,
  logout,
  refreshAccessToken,
  recoverPassword,
  resetPassword,
  getUserProfile,
  getMe,
  searchUsers,
  sortUsers,
  updateProfile,
  updatePreferences,
  deactivateAccount,
  suspendAccount,
  issueWarning,
  uploadCashWallet,
  uploadDriverLicense,
};