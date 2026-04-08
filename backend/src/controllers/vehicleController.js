const { Vehicle } = require('../models');
const { success, error } = require('../utils/responses');

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

    if (req.file) {
      vehicleData.registrationCardImage = `/uploads/${req.file.filename}`;
    }

    const vehicle = await Vehicle.create(vehicleData);

    return success(res, 201, 'Vehicle added successfully.', {
      vehicleId: vehicle._id,
      vehicle,
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

    if (req.file) {
      updates.registrationCardImage = `/uploads/${req.file.filename}`;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return success(res, 200, 'Vehicle updated.', { vehicle: updatedVehicle });
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