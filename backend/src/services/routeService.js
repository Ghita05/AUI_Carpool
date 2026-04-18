/**
 * services/routeService.js
 * All geographic computation for the Routes & Locations building block.
 * Owns: route computation, stop validation, waypoint reordering, location sharing.
 * Data lives on the Ride document — this service reads and writes ride.route.
 */

const { getDirections, isStopOnRoute } = require('../utils/maps');
const { Ride } = require('../models');

// Detour threshold in km for stop validation
const DETOUR_THRESHOLD_KM = 3;

/**
 * computeRoute
 * Called by rideController.postRideOffer() after creating the ride.
 * Returns structured route data to embed in ride.route.
 */
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

/**
 * validateStop
 * Called by bookingController.bookRide() before creating a booking.
 * Returns { onRoute, deviationKM } — throws if API fails (fail open in caller).
 */
async function validateStop(origin, destination, stopLocation) {
  const threshold = DETOUR_THRESHOLD_KM;
  const result = await isStopOnRoute(origin, destination, stopLocation);
  return {
    onRoute: result.deviationKM <= threshold,
    deviationKM: result.deviationKM,
    threshold,
  };
}

/**
 * shareLocation
 * Emits the driver's live coordinates to all passengers via Socket.IO.
 * No database write — pure real-time event.
 */
function shareLocation(io, rideId, driverId, lat, lng) {
  io.to(`ride:${rideId}`).emit('driver-location', {
    rideId,
    driverId,
    coordinates: { lat, lng },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { computeRoute, validateStop, shareLocation };
