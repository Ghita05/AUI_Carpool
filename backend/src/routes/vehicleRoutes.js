const express = require('express');
const router = express.Router();
const vehicle = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Protected routes (all require auth) ──
router.get('/', authenticate, vehicle.getVehicles);
router.get('/select', authenticate, vehicle.selectVehicle);
router.get('/:vehicleId', authenticate, vehicle.getVehicleDetails);

// ── Driver-only routes ──
router.post(
  '/',
  authenticate,
  authorize('Driver'),
  upload.single('registrationCardImage'),
  vehicle.addVehicle
);
router.put(
  '/:vehicleId',
  authenticate,
  authorize('Driver'),
  upload.single('registrationCardImage'),
  vehicle.modifyVehicle
);
router.delete(
  '/:vehicleId',
  authenticate,
  authorize('Driver'),
  vehicle.deleteVehicle
);

module.exports = router;
