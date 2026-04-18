import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { getRideRequests, acceptRideRequest, dismissRideRequest } from '../../services/rideService';
import RouteSelectionModal from '../../components/RouteSelectionModal';

export default function RideRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routePreview, setRoutePreview] = useState(null); // { origin, destination, stops }


  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getRideRequests();
      setRequests(res.data?.requests || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId, rideId) => {
    // Optimistically remove from UI
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
    try {
      await acceptRideRequest(requestId, rideId);
      // Optionally, you can fetchRequests() in background if needed
    } catch (err) {
      // Optionally show error and re-add to UI
    }
  };

  const handleDismiss = async (requestId) => {
    // Optimistically remove from UI
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
    try {
      await dismissRideRequest(requestId);
      // Optionally, you can fetchRequests() in background if needed
    } catch (err) {
      // Optionally show error and re-add to UI
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Requests</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {requests.length === 0 ? (
            <Text style={styles.emptyText}>No ride requests found.</Text>
          ) : (
            requests.map((req) => (
              <View key={req._id} style={styles.rideCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.routeBlock}>
                    <View style={styles.routeDotRow}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                      <View style={styles.routeLine} />
                      <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeCity}>{req.departureLocation}</Text>
                      <Text style={styles.routeCity}>{req.destination}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{new Date(req.departureDateTime).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{new Date(req.departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{req.passengerCount} passengers</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{req.maxPrice} MAD</Text>
                  </View>
                </View>
                {req.notes ? (
                  <View style={styles.notesRow}>
                    <Ionicons name="document-text-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.notesText}>{req.notes}</Text>
                  </View>
                ) : null}
                {/* Stops */}
                {req.stops && req.stops.length > 0 && (
                  <View style={styles.stopsRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>Stops: {req.stops.join(', ')}</Text>
                  </View>
                )}
                {/* Route info */}
                {req.route && req.route.polyline ? (
                  <TouchableOpacity
                    style={styles.routePreviewBtn}
                    onPress={() => setRoutePreview({
                      origin: req.departureLocation,
                      destination: req.destination,
                      stops: req.stops || [],
                    })}
                  >
                    <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                    <Text style={styles.routePreviewText}>
                      {req.route.summary || 'Route'} · {req.route.distanceKM} km · {req.route.durationMinutes} min
                    </Text>
                    <Text style={styles.routeViewLink}>View</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.actionBtnGroup}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnAccent]}
                    onPress={() => handleAccept(req._id, req.rideId)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textWhite} />
                    <Text style={[styles.actionBtnText, { color: Colors.textWhite }]}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() => handleDismiss(req._id)}
                  >
                    <Ionicons name="close-circle-outline" size={14} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Route preview modal */}
      {routePreview && (
        <RouteSelectionModal
          visible={!!routePreview}
          origin={routePreview.origin}
          destination={routePreview.destination}
          stops={routePreview.stops}
          onSelect={() => setRoutePreview(null)}
          onClose={() => setRoutePreview(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.primary,
    fontSize: Typography['2xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  rideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  routeBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.sm },
  routeDotRow: { alignItems: 'center', marginRight: Spacing.sm },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1.5, height: 16, backgroundColor: Colors.border, marginVertical: 2 },
  routeCity: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 2 },
  metaText: { fontSize: Typography.sm, color: Colors.textSecondary, marginLeft: 4 },
  notesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  notesText: { fontSize: Typography.sm, color: Colors.textSecondary, marginLeft: 4 },
  stopsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routePreviewBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 8,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.sm, marginBottom: 8, gap: 6,
  },
  routePreviewText: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },
  routeViewLink: { fontSize: Typography.sm, color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
  actionBtnGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.sm, paddingVertical: 7, paddingHorizontal: 16 },
  actionBtnAccent: { backgroundColor: Colors.primary },
  actionBtnSecondary: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', marginLeft: 6 },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: Typography.lg,
  },
});
