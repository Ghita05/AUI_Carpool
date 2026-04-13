const { Vehicle } = require('../models');
const { User } = require('../models');
const { success, error } = require('../utils/responses');
const { processRegistrationCard, namesMatch } = require('../utils/ocr');

const addVehicle = async (req, res, next) => {
  try {
    const vehicleData = {
      ownerId: req.user._id,
      brand: req.body.brand,
      model: req.body.model,
      color: req.body.color,
      licensePlate: req.body.licensePlate,
      sizeCategory: req.body.sizeCategory,
      luggageCapacity: req.body.luggageCapacity,
      year: req.body.year,
      smokingPolicy: req.body.smokingPolicy,
    };

    let ocrResult = null;
    let ownerNameMatch = null;
    if (req.file) {
      vehicleData.registrationCardImage = `/uploads/${req.file.filename}`;
      try {
        ocrResult = await processRegistrationCard(vehicleData.registrationCardImage);
        // Wrong document check
        if (ocrResult.wrongDocument) {
          return error(res, 400, `Wrong document uploaded. This appears to be a ${ocrResult.detectedTypeLabel}. Please upload your vehicle registration card (Carte Grise).`);
        }
        // Require essential fields
        const missingFields = [];
        if (!ocrResult.licensePlate) missingFields.push('license plate');
        if (!ocrResult.ownerName) missingFields.push('owner name');
        if (missingFields.length > 0) {
          return error(res, 400, `Could not read ${missingFields.join(' and ')} from your registration card. Please take a clearer photo with the card filling the frame and good lighting.`);
        }
        vehicleData.registrationCardVerified = ocrResult.verified;
        if (ocrResult.licensePlate && !vehicleData.licensePlate) {
          vehicleData.licensePlate = ocrResult.licensePlate;
        }
        // Compare owner name from carte grise with user's name
        if (ocrResult.ownerName) {
          const user = await User.findById(req.user._id);
          const userFullName = `${user.firstName} ${user.lastName}`;
          ownerNameMatch = namesMatch(ocrResult.ownerName, userFullName);
        }
      } catch (ocrErr) {
        console.error('Vehicle registration OCR failed (image saved):', ocrErr.message);
      }
    }

    const vehicle = await Vehicle.create(vehicleData);

    return success(res, 201, 'Vehicle added successfully.', {
      vehicleId: vehicle._id,
      vehicle,
      ocrResult: ocrResult ? {
        verified: ocrResult.verified,
        licensePlate: ocrResult.licensePlate || null,
        ownerName: ocrResult.ownerName || null,
        expiryDate: ocrResult.expiryDate || null,
        isExpired: ocrResult.isExpired || false,
        ownerNameMatch,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};

const modifyVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return error(res, 404, 'Vehicle not found.');
    }

    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only modify your own vehicles.');
    }

    const allowedFields = [
      'brand', 'model', 'color', 'licensePlate', 'sizeCategory',
      'luggageCapacity', 'year', 'smokingPolicy',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    let ocrResult = null;
    let ownerNameMatch = null;
    if (req.file) {
      updates.registrationCardImage = `/uploads/${req.file.filename}`;
      try {
        ocrResult = await processRegistrationCard(updates.registrationCardImage);
        // Wrong document check
        if (ocrResult.wrongDocument) {
          return error(res, 400, `Wrong document uploaded. This appears to be a ${ocrResult.detectedTypeLabel}. Please upload your vehicle registration card (Carte Grise).`);
        }
        // Require essential fields
        const missingRegFields = [];
        if (!ocrResult.licensePlate) missingRegFields.push('license plate');
        if (!ocrResult.ownerName) missingRegFields.push('owner name');
        if (missingRegFields.length > 0) {
          return error(res, 400, `Could not read ${missingRegFields.join(' and ')} from your registration card. Please take a clearer photo with the card filling the frame and good lighting.`);
        }
        updates.registrationCardVerified = ocrResult.verified;
        if (ocrResult.licensePlate && !updates.licensePlate) {
          updates.licensePlate = ocrResult.licensePlate;
        }
        if (ocrResult.ownerName) {
          const user = await User.findById(req.user._id);
          const userFullName = `${user.firstName} ${user.lastName}`;
          ownerNameMatch = namesMatch(ocrResult.ownerName, userFullName);
        }
      } catch (ocrErr) {
        console.error('Vehicle registration OCR failed (image saved):', ocrErr.message);
      }
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Vehicle updated.', {
      vehicle: updatedVehicle,
      ocrResult: ocrResult ? {
        verified: ocrResult.verified,
        licensePlate: ocrResult.licensePlate || null,
        ownerName: ocrResult.ownerName || null,
        expiryDate: ocrResult.expiryDate || null,
        isExpired: ocrResult.isExpired || false,
        ownerNameMatch,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return error(res, 404, 'Vehicle not found.');
    }

    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return error(res, 403, 'You can only delete your own vehicles.');
    }

    await Vehicle.findByIdAndDelete(vehicleId);
    return success(res, 200, 'Vehicle deleted.');
  } catch (err) {
    next(err);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user._id });
    return success(res, 200, `${vehicles.length} vehicle(s) found.`, { vehicles });
  } catch (err) {
    next(err);
  }
};

const getVehicleDetails = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) {
      return error(res, 404, 'Vehicle not found.');
    }
    return success(res, 200, 'Vehicle details retrieved.', { vehicle });
  } catch (err) {
    next(err);
  }
};

const selectVehicle = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user._id }).select(
      'brand model color sizeCategory luggageCapacity smokingPolicy licensePlate'
    );
    return success(res, 200, `${vehicles.length} vehicle(s) available.`, { vehicles });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addVehicle,
  modifyVehicle,
  deleteVehicle,
  getVehicles,
  getVehicleDetails,
  selectVehicle,
};