const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Public routes (no JWT required) ──
router.post('/send-verification', auth.sendVerification);
router.get('/check-verification', auth.checkVerification);
router.post('/register', auth.registerUser);
router.get('/verify-email', auth.verifyEmail);
router.post('/resend-verification', auth.resendVerification);
router.post('/login', auth.login);
router.post('/recover-password', auth.recoverPassword);
router.get('/reset-password-page', auth.resetPasswordPage);
router.post('/reset-password', auth.resetPassword);
router.post('/refresh-token', auth.refreshAccessToken);

// Pre-auth OCR preview (used during signup to verify cashwallet before registration)
router.post('/ocr-preview', upload.single('image'), auth.previewOCR);

// Protected routes (JWT required)
router.get('/me', authenticate, auth.getMe);
router.get('/search', authenticate, auth.searchUsers);
router.get('/sort', authenticate, auth.sortUsers);
router.get('/profile/:userId', authenticate, auth.getUserProfile);
router.put('/profile', authenticate, auth.updateProfile);
router.put('/preferences', authenticate, auth.updatePreferences);
router.put('/change-password', authenticate, auth.changePassword);
router.post('/logout', authenticate, auth.logout);
router.delete('/deactivate', authenticate, auth.deactivateAccount);

// File uploads (JWT required)
router.post(
  '/upload/cashwallet',
  authenticate,
  upload.single('cashWalletImage'),
  auth.uploadCashWallet
);
router.post(
  '/upload/license',
  authenticate,
  upload.single('driverLicenseImage'),
  auth.uploadDriverLicense
);

// ── Admin routes ──
router.put('/:userId/suspend', authenticate, authorize('Admin'), auth.suspendAccount);
router.post('/:userId/warn', authenticate, authorize('Admin'), auth.issueWarning);

module.exports = router;
