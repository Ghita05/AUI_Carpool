// Google Maps API helpers — directions, route alternatives, and stop validation.

const { Client, TravelMode, UnitSystem } = require('@googlemaps/google-maps-services-js');

// Max extra km a stop is allowed to add before being rejected as off-route
const MAX_DETOUR_KM = 3;

const mapsClient = new Client({});

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
    // Overview polyline encodes the full path ÔÇö the mobile uses this to draw
    // the route on the map without needing to call Maps again.
    polyline: route.overview_polyline.points,
  };
}

// Returns up to 3 alternative routes for the driver to choose from.
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

        // Extract stop coordinates from leg boundaries (N waypoints = N+1 legs)
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

// Checks if a stop is within MAX_DETOUR_KM of the existing route. Fails open on API error.
async function isStopOnRoute(origin, destination, stopLocation) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Run both calls in parallel — they are independent
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

  // If the API fails, allow the stop rather than blocking the passenger (driver can still reject)
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
