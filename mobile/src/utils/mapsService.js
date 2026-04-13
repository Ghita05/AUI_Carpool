/**
 * utils/mapsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side Google Maps utility for the mobile app.
 *
 * WHY CLIENT-SIDE HERE (and not server-side like maps.js):
 *   Places autocomplete is a UI-assist feature — it fires on every keystroke
 *   while the user types a location. Routing each keystroke through the backend
 *   would add ~100-200ms of network latency per character and create unnecessary
 *   load on our server. The Places Autocomplete API is designed to be called
 *   directly from clients; it does not return sensitive data.
 *
 *   The Directions API (distance/duration computation) stays server-side because
 *   it computes data that gets stored in MongoDB — that is a business logic
 *   operation. Autocomplete is purely a UI enhancement.
 *
 * KEY SAFETY NOTE:
 *   The API key exposed here (EXPO_PUBLIC_GOOGLE_MAPS_KEY) must have its
 *   "Application restrictions" set to "Android apps" and "iOS apps" in Google
 *   Cloud Console so it cannot be used from arbitrary servers if extracted.
 *   In the current dev setup (no restriction) this is acceptable, but should
 *   be tightened before any public release.
 *
 * EXPORTS:
 *   autocompleteLocation(input, sessionToken)
 *     → Promise<Array<{ placeId, description, mainText, secondaryText }>>
 *
 *   geocodePlace(placeId, sessionToken)
 *     → Promise<{ lat, lng, formattedAddress }>
 */

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Bias autocomplete results toward Morocco (Ifrane area).
// location= is the center point, radius= is the bias radius in meters.
// This is a bias, not a hard filter — distant results can still appear if
// the query strongly matches them (e.g. "Casablanca Airport").
const LOCATION_BIAS = 'location=33.5332,5.1116&radius=200000'; // ~200km from Ifrane

/**
 * autocompleteLocation
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the Places Autocomplete API and returns formatted suggestions.
 *
 * @param {string} input           - User's current text input
 * @param {string} [sessionToken]  - UUID grouping autocomplete+geocode calls
 *                                   for billing purposes (one charge per session
 *                                   instead of per-request). Generate once per
 *                                   input session and reuse across keystrokes.
 * @returns {Promise<Array<{
 *   placeId: string,
 *   description: string,     // Full address string
 *   mainText: string,        // Primary location name (e.g. "Fez Airport")
 *   secondaryText: string,   // Secondary context (e.g. "Fez, Morocco")
 * }>>}
 */
export async function autocompleteLocation(input, sessionToken = '') {
  if (!input || input.trim().length < 2) return [];

  if (!MAPS_KEY) {
    console.warn('[mapsService] EXPO_PUBLIC_GOOGLE_MAPS_KEY is not set');
    return [];
  }

  const encodedInput = encodeURIComponent(input.trim());
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodedInput}` +
    `&${LOCATION_BIAS}` +
    `&components=country:ma` +  // restrict to Morocco
    `&sessiontoken=${sessionToken}` +
    `&key=${MAPS_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[mapsService] autocompleteLocation status:', data.status);
      return [];
    }

    return (data.predictions || []).map((pred) => ({
      placeId: pred.place_id,
      description: pred.description,
      mainText: pred.structured_formatting?.main_text || pred.description,
      secondaryText: pred.structured_formatting?.secondary_text || '',
    }));
  } catch (err) {
    console.warn('[mapsService] autocompleteLocation fetch failed:', err.message);
    return [];
  }
}

/**
 * geocodePlace
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts a placeId (from autocomplete) into lat/lng coordinates.
 * Used when we need to place a marker on the map for a selected location.
 * Uses the same sessionToken as the preceding autocomplete calls so billing
 * groups them into a single session.
 *
 * @param {string} placeId
 * @param {string} [sessionToken]
 * @returns {Promise<{ lat: number, lng: number, formattedAddress: string } | null>}
 */
export async function geocodePlace(placeId, sessionToken = '') {
  if (!placeId || !MAPS_KEY) return null;

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=geometry,formatted_address` +
    `&sessiontoken=${sessionToken}` +
    `&key=${MAPS_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result?.geometry?.location) {
      console.warn('[mapsService] geocodePlace status:', data.status);
      return null;
    }

    return {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
      formattedAddress: data.result.formatted_address,
    };
  } catch (err) {
    console.warn('[mapsService] geocodePlace fetch failed:', err.message);
    return null;
  }
}
