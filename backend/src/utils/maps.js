/**
 * utils/maps.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all Google Maps API calls in the backend.
 *
 * WHY THIS EXISTS HERE (tier rationale):
 *   The API key must never leave the server. Both calls — Directions and the
 *   stop-validation waypoint check — are purely business-logic operations that
 *   produce data stored in MongoDB or used to enforce domain rules. They belong
 *   in the Business Logic Tier, consumed by controllers, never by the client.
 *
 * STRATEGY:
 *   We use the official @googlemaps/google-maps-services-js Node SDK rather
 *   than raw fetch/axios calls. The SDK handles retries, status-code mapping,
 *   and keeps our code decoupled from raw HTTP concerns.
 *
 *   Two exported functions:
 *     1. getDirections(origin, destination, waypoints[])
 *        Called by postRideOffer to compute and store route metadata.
 *        Returns { distanceKM, durationMinutes, originLat, originLng,
 *                  destLat, destLng, polyline }
 *
 *     2. isStopOnRoute(origin, destination, stopLocation)
 *        Called by requestAdditionalStop before accepting a stop.
 *        Returns { onRoute: Boolean, deviationKM: Number }
 *        A stop is "on route" when the detour it introduces is ≤ MAX_DETOUR_KM.
 */

const { Client, TravelMode, UnitSystem } = require('@googlemaps/google-maps-services-js');

// ── Constants ─────────────────────────────────────────────────────────────────

// Maximum additional distance (km) a stop is allowed to add to the route
// before we consider it "off route" and reject it.
// 3 km is intentionally generous — covers stops just off a highway exit.
const MAX_DETOUR_KM = 3;

// ── SDK client — one instance reused across all requests ─────────────────────
// The SDK client is stateless; creating it once at module load is the
// recommended pattern (avoids TCP connection overhead per request).
const mapsClient = new Client({});

/**
 * getDirections
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the Directions API from origin → destination, optionally via waypoints
 * (the ride's declared stops). Returns structured route metadata ready to be
 * embedded in the Ride document's `route` sub-document.
 *
 * @param {string}   origin       - Departure location string (e.g. "AUI Main Gate, Ifrane")
 * @param {string}   destination  - Destination string (e.g. "Fez Airport")
 * @param {string[]} [waypoints]  - Intermediate stops (ride.stops array)
 * @returns {Promise<{
 *   distanceKM: number,
 *   durationMinutes: number,
 *   originLat: number,
 *   originLng: number,
 *   destLat: number,
 *   destLng: number,
 *   polyline: string        // encoded overview polyline for map rendering
 * }>}
 * @throws Error if the API returns a non-OK status
 */
async function getDirections(origin, destination, waypoints = []) {
  const params = {
    origin,
    destination,
    travelMode: TravelMode.driving,
    unitSystem: UnitSystem.metric,
    key: process.env.GOOGLE_MAPS_API_KEY,
  };

  // Only include waypoints param when there are actual stops.
  // An empty waypoints array would cause the API to return an error.
  if (waypoints && waypoints.length > 0) {
    params.waypoints = waypoints;
  }

  const response = await mapsClient.directions({ params });

  const { status, routes } = response.data;

  if (status !== 'OK' || !routes || routes.length === 0) {
    throw new Error(`Google Maps Directions API returned status: ${status}`);
  }

  const route = routes[0];

  // The Directions API returns one "leg" per waypoint segment.
  // Summing all legs gives us the full trip distance and duration.
  const legs = route.legs;
  const totalDistanceMeters = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
  const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

  // Origin coordinates come from the first leg's start_location.
  // Destination coordinates come from the last leg's end_location.
  const originLoc = legs[0].start_location;
  const destLoc = legs[legs.length - 1].end_location;

  return {
    distanceKM: parseFloat((totalDistanceMeters / 1000).toFixed(1)),
    durationMinutes: Math.round(totalDurationSeconds / 60),
    originLat: originLoc.lat,
    originLng: originLoc.lng,
    destLat: destLoc.lat,
    destLng: destLoc.lng,
    // Overview polyline encodes the full path — the mobile uses this to draw
    // the route on the map without needing to call Maps again.
    polyline: route.overview_polyline.points,
  };
}

/**
 * getAlternativeRoutes
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls Directions API with alternatives=true. Returns ALL routes so the user
 * can choose their preferred path before publishing a ride.
 *
 * @param {string}   origin
 * @param {string}   destination
 * @param {string[]} [waypoints] - Optional intermediate stops
 * @returns {Promise<Array<{
 *   index: number,
 *   summary: string,
 *   distanceKM: number,
 *   durationMinutes: number,
 *   originLat: number,
 *   originLng: number,
 *   destLat: number,
 *   destLng: number,
 *   polyline: string
 * }>>}
 */
async function getAlternativeRoutes(origin, destination, waypoints = []) {
  const params = {
    origin,
    destination,
    travelMode: TravelMode.driving,
    unitSystem: UnitSystem.metric,
    alternatives: true,
    key: process.env.GOOGLE_MAPS_API_KEY,
  };

  if (waypoints && waypoints.length > 0) {
    params.waypoints = waypoints;
  }

  const response = await mapsClient.directions({ params });
  const { status, routes } = response.data;

  if (status !== 'OK' || !routes || routes.length === 0) {
    throw new Error(`Google Maps Directions API returned status: ${status}`);
  }

  return routes.map((route, index) => {
    const legs = route.legs;
    const totalDistanceMeters = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.duration.value, 0);
    const originLoc = legs[0].start_location;
    const destLoc = legs[legs.length - 1].end_location;

    // Extract geocoded waypoint (stop) coordinates from leg boundaries.
    // With N waypoints there are N+1 legs; each intermediate leg boundary is a stop.
    const waypointCoords = [];
    for (let i = 0; i < legs.length - 1; i++) {
      const loc = legs[i].end_location;
      waypointCoords.push({
        latitude: loc.lat,
        longitude: loc.lng,
        name: waypoints && waypoints[i] ? waypoints[i] : `Stop ${i + 1}`,
      });
    }

    return {
      index,
      summary: route.summary || `Route ${index + 1}`,
      distanceKM: parseFloat((totalDistanceMeters / 1000).toFixed(1)),
      durationMinutes: Math.round(totalDurationSeconds / 60),
      originLat: originLoc.lat,
      originLng: originLoc.lng,
      destLat: destLoc.lat,
      destLng: destLoc.lng,
      polyline: route.overview_polyline.points,
      waypoints: waypointCoords,
    };
  });
}

/**
 * isStopOnRoute
 * ─────────────────────────────────────────────────────────────────────────────
 * Determines whether a passenger-requested stop location is reasonably on the
 * existing route between origin and destination.
 *
 * METHOD:
 *   1. Get the baseline route distance (origin → destination, no detour).
 *   2. Get the detoured route distance (origin → stop → destination).
 *   3. Compute deviation = detoured distance − baseline distance.
 *   4. If deviation ≤ MAX_DETOUR_KM → on route. Otherwise → off route.
 *
 * WHY TWO CALLS:
 *   Google Maps has no "is point on polyline" endpoint. The waypoint-deviation
 *   approach is the standard production technique used by BlaBlaCar and others.
 *   We accept the cost of two API calls because stop validation only happens
 *   when a passenger explicitly requests a custom stop — a low-frequency event.
 *
 * @param {string} origin
 * @param {string} destination
 * @param {string} stopLocation
 * @returns {Promise<{ onRoute: boolean, deviationKM: number }>}
 */
async function isStopOnRoute(origin, destination, stopLocation) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Run both calls in parallel — they are independent.
  const [baselineRes, detourRes] = await Promise.all([
    mapsClient.directions({
      params: {
        origin,
        destination,
        travelMode: TravelMode.driving,
        unitSystem: UnitSystem.metric,
        key: apiKey,
      },
    }),
    mapsClient.directions({
      params: {
        origin,
        destination,
        waypoints: [stopLocation],
        travelMode: TravelMode.driving,
        unitSystem: UnitSystem.metric,
        key: apiKey,
      },
    }),
  ]);

  // If either call fails, we fail open (allow the stop) rather than blocking
  // the passenger due to a transient API error. The driver can still reject it.
  if (
    baselineRes.data.status !== 'OK' ||
    detourRes.data.status !== 'OK' ||
    !baselineRes.data.routes.length ||
    !detourRes.data.routes.length
  ) {
    console.warn('[maps.js] isStopOnRoute: API non-OK, failing open.', {
      baselineStatus: baselineRes.data.status,
      detourStatus: detourRes.data.status,
    });
    return { onRoute: true, deviationKM: 0 };
  }

  const baselineMeters = baselineRes.data.routes[0].legs.reduce(
    (sum, leg) => sum + leg.distance.value, 0
  );
  const detourMeters = detourRes.data.routes[0].legs.reduce(
    (sum, leg) => sum + leg.distance.value, 0
  );

  const deviationKM = parseFloat(((detourMeters - baselineMeters) / 1000).toFixed(2));

  return {
    onRoute: deviationKM <= MAX_DETOUR_KM,
    deviationKM,
  };
}

module.exports = { getDirections, getAlternativeRoutes, isStopOnRoute };
