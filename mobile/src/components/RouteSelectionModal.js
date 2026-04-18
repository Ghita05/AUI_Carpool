import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
  Dimensions, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { getRouteAlternatives } from '../services/rideService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ROUTE_COLORS = ['#1B5E20', '#1565C0', '#E65100', '#6A1B9A', '#B71C1C'];

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

export default function RouteSelectionModal({ visible, origin, destination, stops, onSelect, onClose }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mapRef = useRef(null);

  useEffect(() => {
    if (visible && origin && destination) {
      fetchRoutes();
    }
    return () => { setRoutes([]); setSelectedIdx(0); };
  }, [visible, origin, destination]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await getRouteAlternatives(origin, destination, stops || []);
      const fetched = res.data?.routes || res.routes || [];
      if (fetched.length === 0) {
        Alert.alert('No routes', 'Google Maps could not find any routes between these locations.');
        onClose();
        return;
      }
      setRoutes(fetched);
      setSelectedIdx(0);
      // Fit map to first route after a short delay
      setTimeout(() => fitMapToRoute(fetched[0]), 300);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to fetch routes.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fitMapToRoute = (route) => {
    if (!mapRef.current || !route) return;
    const coords = decodePolyline(route.polyline);
    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    }
  };

  const handleSelectRoute = (idx) => {
    setSelectedIdx(idx);
    fitMapToRoute(routes[idx]);
  };

  const handleConfirm = () => {
    if (routes[selectedIdx]) {
      onSelect(routes[selectedIdx]);
    }
  };

  const renderRouteCard = ({ item, index }) => {
    const isActive = index === selectedIdx;
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
    return (
      <TouchableOpacity
        style={[styles.routeCard, isActive && styles.routeCardActive, isActive && { borderColor: color }]}
        onPress={() => handleSelectRoute(index)}
        activeOpacity={0.7}
      >
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <View style={styles.routeInfo}>
          <Text style={[styles.routeSummary, isActive && styles.routeSummaryActive]} numberOfLines={1}>
            {item.summary || `Route ${index + 1}`}
          </Text>
          <Text style={styles.routeMeta}>
            {item.distanceKM} km  ·  {item.durationMinutes} min
          </Text>
        </View>
        {isActive && (
          <Ionicons name="checkmark-circle" size={22} color={color} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            style={{ marginRight: 14 }}
          >
            <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Route</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching routes from Google Maps…</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Map */}
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {routes.map((route, idx) => {
                const coords = decodePolyline(route.polyline);
                const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                const isActive = idx === selectedIdx;
                return (
                  <Polyline
                    key={`route-${idx}`}
                    coordinates={coords}
                    strokeColor={isActive ? color : `${color}55`}
                    strokeWidth={isActive ? 5 : 3}
                    zIndex={isActive ? 10 : 1}
                    tappable
                    onPress={() => handleSelectRoute(idx)}
                  />
                );
              })}
              {/* Origin marker */}
              {routes.length > 0 && (
                <>
                  <Marker
                    coordinate={{
                      latitude: routes[0].originLat,
                      longitude: routes[0].originLng,
                    }}
                    title="Departure"
                    pinColor={Colors.primary}
                  />
                  <Marker
                    coordinate={{
                      latitude: routes[0].destLat,
                      longitude: routes[0].destLng,
                    }}
                    title="Destination"
                    pinColor={Colors.error}
                  />
                </>
              )}
              {/* Stop markers */}
              {routes[selectedIdx]?.waypoints?.map((wp, i) => (
                <Marker
                  key={`stop-${i}`}
                  coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.stopMarker}>
                    <Ionicons name="flag" size={16} color={Colors.textWhite} />
                  </View>
                  <Callout tooltip>
                    <View style={styles.stopCallout}>
                      <Text style={styles.stopCalloutText}>{wp.name}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>

            {/* Route list at bottom */}
            <View style={styles.bottomSheet}>
              <Text style={styles.routeCountLabel}>
                {routes.length === 1
                  ? 'Best route for your trip'
                  : `${routes.length} routes found`}
              </Text>
              {routes.length > 1 && (
                <FlatList
                  data={routes}
                  renderItem={renderRouteCard}
                  keyExtractor={(_, i) => `route-${i}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.routeList}
                />
              )}
              {routes.length === 1 && (
                <View style={[styles.routeCard, styles.routeCardActive, { borderColor: ROUTE_COLORS[0], marginBottom: 12 }]}>  
                  <View style={[styles.colorDot, { backgroundColor: ROUTE_COLORS[0] }]} />
                  <View style={styles.routeInfo}>
                    <Text style={[styles.routeSummary, styles.routeSummaryActive]} numberOfLines={1}>
                      {routes[0].summary || 'Route 1'}
                    </Text>
                    <Text style={styles.routeMeta}>
                      {routes[0].distanceKM} km  ·  {routes[0].durationMinutes} min
                    </Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color={Colors.textWhite} />
                <Text style={styles.confirmBtnText}>
                  {routes.length === 1 ? 'Use this route' : 'Select this route'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    ...Shadows.lg,
  },
  routeCountLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  routeList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 180,
  },
  routeCardActive: {
    backgroundColor: Colors.primaryBg,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  routeInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  routeSummary: {
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
  },
  routeSummaryActive: {
    fontWeight: Typography.semiBold,
  },
  routeMeta: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  confirmBtnText: {
    fontSize: Typography.lg,
    fontWeight: Typography.semiBold,
    color: Colors.textWhite,
  },
  stopMarker: {
    backgroundColor: Colors.warning,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textWhite,
  },
  stopCallout: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stopCalloutText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
});
