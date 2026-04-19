import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../utils/MapView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Shadows } from '../theme';
import { validateStopOnRoute } from '../services/rideService';
import { autocompleteLocation, geocodePlace, geocodeAddress } from '../utils/mapsService';

// Decode Google's encoded polyline format into [{latitude, longitude}] array
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function AddStopMapModal({ visible, ride, existingStops = [], onClose, onStopAdded }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [existingCoords, setExistingCoords] = useState([]);
  const debounceRef = useRef(null);
  const sessionRef = useRef(`${Date.now()}`);

  const origin = ride?.route ? { lat: ride.route.originLatitude, lng: ride.route.originLongitude } : null;
  const dest = ride?.route ? { lat: ride.route.destinationLatitude, lng: ride.route.destinationLongitude } : null;
  const polyCoords = ride?.route?.polyline ? decodePolyline(ride.route.polyline) : [];

  useEffect(() => {
    if (!visible || existingStops.length === 0) { setExistingCoords([]); return; }
    let cancelled = false;
    (async () => {
      const results = [];
      for (const s of existingStops) {
        const geo = await geocodeAddress(s);
        if (geo && !cancelled) results.push({ name: s, ...geo });
      }
      if (!cancelled) setExistingCoords(results);
    })();
    return () => { cancelled = true; };
  }, [visible, existingStops.length]);

  useEffect(() => {
    if (visible) { setQuery(''); setSuggestions([]); setSelectedStop(null); setValidation(null); sessionRef.current = `${Date.now()}`; }
  }, [visible]);

  const handleSearch = useCallback((text) => {
    setQuery(text);
    setSelectedStop(null);
    setValidation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocompleteLocation(text, sessionRef.current);
        setSuggestions(results || []);
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  const handleSelect = useCallback(async (item) => {
    setSuggestions([]);
    setQuery(item.description || item.mainText);
    setValidating(true);
    setValidation(null);
    try {
      const geo = await geocodePlace(item.placeId, sessionRef.current);
      if (!geo) { Alert.alert('Error', 'Could not locate this place.'); setValidating(false); return; }
      const stopObj = { name: item.mainText || item.description, lat: geo.lat, lng: geo.lng };
      setSelectedStop(stopObj);
      const res = await validateStopOnRoute(ride.departureLocation, ride.destination, stopObj.name);
      setValidation(res.data || { onRoute: false });
    } catch {
      Alert.alert('Error', 'Could not validate stop.');
    } finally {
      setValidating(false);
    }
  }, [ride]);

  const handleConfirm = () => {
    if (!selectedStop || !validation?.isOnRoute) return;
    onStopAdded(selectedStop.name);
    setSelectedStop(null);
    setValidation(null);
    setQuery('');
    onClose();
  };

  if (!ride?.route) return null;

  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;
  const latD = Math.abs(origin.lat - dest.lat) * 1.5 || 0.05;
  const lngD = Math.abs(origin.lng - dest.lng) * 1.5 || 0.05;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginLeft: 8 }}>Add Stop on Route</Text>
        </View>

        <View style={{ padding: Spacing.md, backgroundColor: Colors.surface, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: Colors.background }}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary }}
              value={query}
              onChangeText={handleSearch}
              placeholder="Search for a stop location..."
              placeholderTextColor={Colors.textDisabled}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); setSelectedStop(null); setValidation(null); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={{ position: 'absolute', top: 60 + Spacing.md, left: Spacing.md, right: Spacing.md, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, zIndex: 20, maxHeight: 200, ...Shadows.card }}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {suggestions.map((s, i) => (
                  <TouchableOpacity key={s.placeId || i} onPress={() => handleSelect(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < suggestions.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
                    <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }} numberOfLines={1}>{s.mainText}</Text>
                      {s.secondaryText ? <Text style={{ fontSize: 11, color: Colors.textSecondary }} numberOfLines={1}>{s.secondaryText}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: latD, longitudeDelta: lngD }}
          >
            {polyCoords.length > 0 && <Polyline coordinates={polyCoords} strokeColor={Colors.primary} strokeWidth={4} />}
            <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Origin" pinColor="#1B5E20" />
            <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title="Destination" pinColor="#B71C1C" />
            {existingCoords.map((s, i) => (
              <Marker key={`existing-${i}`} coordinate={{ latitude: s.lat, longitude: s.lng }} title={s.name} pinColor="#FF8F00" />
            ))}
            {selectedStop && (
              <Marker coordinate={{ latitude: selectedStop.lat, longitude: selectedStop.lng }} title={selectedStop.name} pinColor={validation?.isOnRoute ? '#4CAF50' : '#F44336'} />
            )}
          </MapView>
        </View>

        {(validating || selectedStop) && (
          <View style={{ padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }}>
            {validating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Validating stop on route...</Text>
              </View>
            ) : validation?.isOnRoute ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#4CAF50' }}>Stop is on route</Text>
                  {validation.deviationKM != null && <Text style={{ fontSize: 11, color: Colors.textSecondary }}>({validation.deviationKM.toFixed(1)} km detour)</Text>}
                </View>
                <TouchableOpacity style={{ height: 46, backgroundColor: Colors.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }} onPress={handleConfirm}>
                  <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' }}>Confirm & Add Stop</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.error }}>Stop is not on the route</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
