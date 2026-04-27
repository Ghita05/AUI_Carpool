// Server-side proxy for Google Maps Places and Geocoding API calls.
// Routes web requests through the backend to avoid CORS restrictions on the browser client.

const express = require('express');
const router = express.Router();
const { Client } = require('@googlemaps/google-maps-services-js');
const { authenticate } = require('../middleware/auth');

const mapsClient = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// GET /api/maps/autocomplete
router.get('/autocomplete', authenticate, async (req, res) => {
  const { input, sessiontoken } = req.query;
  if (!input || input.trim().length < 2) return res.json({ predictions: [] });

  try {
    const response = await mapsClient.placeAutocomplete({
      params: {
        input: input.trim(),
        location: '33.5332,5.1116',
        radius: 200000,
        components: 'country:ma',
        sessiontoken: sessiontoken || undefined,
        key: API_KEY,
      },
    });

    const { status, predictions } = response.data;
    if (status !== 'OK' && status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: `Maps API status: ${status}` });
    }
    res.json({ predictions: predictions || [] });
  } catch (err) {
    console.error('[mapsRoutes] autocomplete error:', err.message);
    res.status(502).json({ error: 'Autocomplete request failed' });
  }
});

// GET /api/maps/place-details
router.get('/place-details', authenticate, async (req, res) => {
  const { placeId, sessiontoken } = req.query;
  if (!placeId) return res.status(400).json({ error: 'placeId is required' });

  try {
    const response = await mapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['geometry', 'formatted_address'],
        sessiontoken: sessiontoken || undefined,
        key: API_KEY,
      },
    });

    const { status, result } = response.data;
    if (status !== 'OK' || !result?.geometry?.location) {
      return res.status(502).json({ error: `Maps API status: ${status}` });
    }
    res.json({
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    });
  } catch (err) {
    console.error('[mapsRoutes] place-details error:', err.message);
    res.status(502).json({ error: 'Place details request failed' });
  }
});

// GET /api/maps/geocode
router.get('/geocode', authenticate, async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address is required' });

  try {
    const response = await mapsClient.geocode({
      params: {
        address,
        components: 'country:MA',
        key: API_KEY,
      },
    });

    const { status, results } = response.data;
    if (status !== 'OK' || !results?.length) {
      return res.status(502).json({ error: `Maps API status: ${status}` });
    }
    const loc = results[0].geometry.location;
    res.json({
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: results[0].formatted_address,
    });
  } catch (err) {
    console.error('[mapsRoutes] geocode error:', err.message);
    res.status(502).json({ error: 'Geocode request failed' });
  }
});

module.exports = router;
