// Route computation and stop validation for ride offers and bookings.

const { getDirections, isStopOnRoute } = require('../utils/maps');
const { Ride } = require('../models');

// Detour threshold in km for stop validation
const DETOUR_THRESHOLD_KM = 3;

// Returns structured route data from Google Directions for embedding in ride.route.
async function computeRoute(departureLocation, destination, stops = []) {
  const directions = await getDirections(departureLocation, destination, stops);
  return {
    originLatitude:       directions.originLat,
    originLongitude:      directions.originLng,
    destinationLatitude:  directions.destLat,
    destinationLongitude: directions.destLng,
    distanceKM:           directions.distanceKM,
    durationMinutes:      directions.durationMinutes,
    polyline:             directions.polyline,
    waypoints:            [],
  };
}

// Checks whether a stop is within DETOUR_THRESHOLD_KM of the route. Returns { onRoute, deviationKM }.
async function validateStop(origin, destination, stopLocation) {
  const threshold = DETOUR_THRESHOLD_KM;
  const result = await isStopOnRoute(origin, destination, stopLocation);
  return {
    onRoute: result.deviationKM <= threshold,
    deviationKM: result.deviationKM,
    threshold,
  };
}

// Emits the driver's live coordinates to all passengers via Socket.IO. No DB write.
function shareLocation(io, rideId, driverId, lat, lng) {
  io.to(`ride:${rideId}`).emit('driver-location', {
    rideId,
    driverId,
    coordinates: { lat, lng },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { computeRoute, validateStop, shareLocation };
