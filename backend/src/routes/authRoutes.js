const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Public routes (no JWT required) ──
router.post('/send-verification', auth.sendVerification);
router.get('/check-verification', auth.checkVerification);
router.post('/register', auth.registerUser);
router.get('/verify-email', auth.verifyEmail);
router.post('/verify-email', auth.confirmEmail);
router.post('/resend-verification', auth.resendVerification);
router.post('/login', auth.login);
router.post('/recover-password', auth.recoverPassword);
router.get('/reset-password-page', auth.resetPasswordPage);
router.post('/reset-password', auth.resetPassword);
router.post('/refresh-token', auth.refreshAccessToken);

// Pre-auth OCR preview — memory storage, no Cloudinary upload
router.post('/ocr-preview', uploadMemory.single('image'), auth.previewOCR);

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
router.post(
  '/upload/profile-picture',
  authenticate,
  upload.single('profilePicture'),
  auth.uploadProfilePicture
);

// ── Admin routes ──
router.put('/:userId/suspend', authenticate, authorize('Admin'), auth.suspendAccount);
router.post('/:userId/warn', authenticate, authorize('Admin'), auth.issueWarning);

module.exports = router;
