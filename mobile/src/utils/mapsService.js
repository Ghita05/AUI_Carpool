// Client-side Google Maps utility for the mobile app.
// Places autocomplete calls the API directly (low-latency UI assist); geocoding goes through the backend.
// The API key (EXPO_PUBLIC_GOOGLE_MAPS_KEY) must be restricted to Android/iOS apps in Google Cloud Console.

import { Platform } from 'react-native';
import api from '../services/api';

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Bias autocomplete results toward Morocco (Ifrane area).
// location= is the center point, radius= is the bias radius in meters.
// This is a bias, not a hard filter — distant results can still appear if
// the query strongly matches them (e.g. "Casablanca Airport").
const LOCATION_BIAS = 'location=33.5332,5.1116&radius=200000'; // ~200km from Ifrane

// On web, the Google Maps REST endpoints block direct browser fetch calls with
// CORS errors. We proxy through our own backend instead, which has no CORS
// restriction. On native (iOS/Android) the direct REST calls still work fine.
const IS_WEB = Platform.OS === 'web';

// Calls the Places Autocomplete API and returns formatted suggestions.
// sessionToken groups autocomplete + geocode calls for billing (one charge per session).
export async function autocompleteLocation(input, sessionToken = '') {
  if (!input || input.trim().length < 2) return [];

  if (IS_WEB) {
    try {
      const res = await api.get('/maps/autocomplete', {
        params: { input: input.trim(), sessiontoken: sessionToken },
      });
      return (res.data.predictions || []).map((pred) => ({
        placeId: pred.place_id,
        description: pred.description,
        mainText: pred.structured_formatting?.main_text || pred.description,
        secondaryText: pred.structured_formatting?.secondary_text || '',
      }));
    } catch (err) {
      console.warn('[mapsService] autocompleteLocation (web) failed:', err.message);
      return [];
    }
  }

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

// Converts a placeId (from autocomplete) into lat/lng coordinates.
// Uses the same sessionToken as the preceding autocomplete calls for billing grouping.
export async function geocodePlace(placeId, sessionToken = '') {
  if (!placeId) return null;

  if (IS_WEB) {
    try {
      const res = await api.get('/maps/place-details', {
        params: { placeId, sessiontoken: sessionToken },
      });
      return res.data;
    } catch (err) {
      console.warn('[mapsService] geocodePlace (web) failed:', err.message);
      return null;
    }
  }

  if (!MAPS_KEY) return null;

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

// Converts an address string into lat/lng coordinates using the Geocoding API.
// Used when we have a place name (e.g. a stop string) and need to plot it on the map.
export async function geocodeAddress(address) {
  if (!address) return null;

  if (IS_WEB) {
    try {
      const res = await api.get('/maps/geocode', { params: { address } });
      return res.data;
    } catch (err) {
      console.warn('[mapsService] geocodeAddress (web) failed:', err.message);
      return null;
    }
  }

  if (!MAPS_KEY) return null;

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&components=country:MA` +
    `&key=${MAPS_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('[mapsService] geocodeAddress status:', data.status);
      return null;
    }

    const loc = data.results[0].geometry.location;
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: data.results[0].formatted_address,
    };
  } catch (err) {
    console.warn('[mapsService] geocodeAddress fetch failed:', err.message);
    return null;
  }
}

// Converts lat/lng coordinates into a human-readable place name.
// Always proxied through the backend on both web and native — the server key
// has no application restrictions and contains the two-pass fallback logic,
// which guarantees a named result rather than raw coordinates.
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;

  try {
    const res = await api.get('/maps/reverse-geocode', { params: { lat, lng } });
    return res.data; // { placeName, formattedAddress, lat, lng }
  } catch (err) {
    console.warn('[mapsService] reverseGeocode failed:', err.message);
    return null;
  }
}
