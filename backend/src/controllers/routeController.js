/**
 * controllers/routeController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated controller for all route, location, and stop logic.
 * Provides modularity by keeping route concerns separate from ride CRUD.
 */

const { Ride } = require('../models');
const { success, error } = require('../utils/responses');
const { getAlternativeRoutes, isStopOnRoute } = require('../utils/maps');
const routeService = require('../services/routeService');

// ── getRouteAlternatives ────────────────────────────────────────────────────
// Returns all alternative routes between origin and destination via Google
// Directions API. The user picks their preferred route before publishing a ride.
const getRouteAlternatives = async (req, res, next) => {
  try {
    const { origin, destination, stops } = req.body;

    if (!origin || !origin.trim()) return error(res, 400, 'Origin is required.');
    if (!destination || !destination.trim()) return error(res, 400, 'Destination is required.');

    const routes = await getAlternativeRoutes(origin.trim(), destination.trim(), stops || []);

    return success(res, 200, `${routes.length} route(s) found.`, { routes });
  } catch (err) {
    console.warn('[routeController] getRouteAlternatives failed:', err.message);
    return error(res, 502, 'Could not fetch routes from Google Maps. Please try again.');
  }
};

// ── getRouteForRide ─────────────────────────────────────────────────────────
// Returns the route sub-document for a given ride.
const getRouteForRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne(
      { _id: req.params.rideId, type: 'Offer' },
      { route: 1, departureLocation: 1, destination: 1 }
    );
    if (!ride) return error(res, 404, 'Ride not found.');
    return success(res, 200, 'Route retrieved.', { route: ride.route });
  } catch (err) { next(err); }
};

// ── validateStopOnRoute ─────────────────────────────────────────────────────
// Checks whether a stop location is within the detour threshold.
// Supports two modes:
//   1. rideId-based: looks up origin/destination from the DB (for post-publish)
//   2. direct: origin + destination supplied in the body (for pre-publish)
const validateStop = async (req, res, next) => {
  try {
    const { rideId, origin, destination, stopLocation } = req.body;

    if (!stopLocation || !stopLocation.trim()) return error(res, 400, 'stopLocation is required.');

    let tripOrigin, tripDestination;

    if (rideId) {
      const ride = await Ride.findOne(
        { _id: rideId, type: 'Offer' },
        { departureLocation: 1, destination: 1 }
      );
      if (!ride) return error(res, 404, 'Ride not found.');
      tripOrigin = ride.departureLocation;
      tripDestination = ride.destination;
    } else if (origin && destination) {
      tripOrigin = origin.trim();
      tripDestination = destination.trim();
    } else {
      return error(res, 400, 'Provide either rideId or both origin and destination.');
    }

    const result = await isStopOnRoute(tripOrigin, tripDestination, stopLocation.trim());

    return success(res, 200, result.onRoute ? 'Stop is on route.' : 'Stop is off route.', result);
  } catch (err) { next(err); }
};

// ── shareDriverLocation ─────────────────────────────────────────────────────
// Emits the driver's live GPS via Socket.IO — no DB write.
const shareDriverLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return error(res, 400, 'Coordinates required.');
    const io = req.app.get('io');
    routeService.shareLocation(io, req.params.rideId, req.user._id, lat, lng);
    return success(res, 200, 'Location shared.');
  } catch (err) { next(err); }
};

module.exports = {
  getRouteAlternatives,
  getRouteForRide,
  validateStop,
  shareDriverLocation,
};
