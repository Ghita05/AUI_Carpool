import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { getRideRequests, acceptRideRequest, dismissRideRequest, mergeRideRequests } from '../../services/rideService';
import RouteSelectionModal from '../../components/RouteSelectionModal';
import MergeRequestsModal from '../../components/MergeRequestsModal';

export default function RideRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routePreview, setRoutePreview] = useState(null); // { origin, destination, stops }
  const [mergeModal, setMergeModal] = useState(null); // { offerRideId, candidates, availableSeats }

  // Search & sort state
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'passengers'
  const [order, setOrder] = useState('desc'); // 'asc' | 'desc'

  const fetchRequests = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const filters = {
        destination: overrides.destination ?? destination,
        date:        overrides.date        ?? date,
        sortBy:      overrides.sortBy      ?? sortBy,
        order:       overrides.order       ?? order,
      };
      // strip empty strings so backend doesn't receive blank params
      Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });
      const res = await getRideRequests(filters);
      setRequests(res.data?.requests || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [destination, date, sortBy, order]);

  useEffect(() => {
    fetchRequests();
  }, [sortBy, order]);  // re-fetch when sort changes instantly

  const handleSearch = () => fetchRequests();

  const handleClearSearch = () => {
    setDestination('');
    setDate('');
    fetchRequests({ destination: '', date: '' });
  };

  const toggleSortBy = (field) => {
    if (sortBy === field) {
      setOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('desc');
    }
  };

  const handleAccept = async (requestId, rideId) => {
    // Optimistically remove from UI
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
    try {
      const res = await acceptRideRequest(requestId, rideId);
      const { luggageWarning, mergeCandidates, ride } = res.data || {};

      if (luggageWarning) {
        Alert.alert(
          'Luggage Warning',
          luggageWarning.message,
          [{ text: 'Understood', style: 'default' }]
        );
      }

      if (mergeCandidates && mergeCandidates.length > 0) {
        setMergeModal({
          offerRideId: ride?._id,
          candidates: mergeCandidates,
          availableSeats: ride?.availableSeats ?? 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not accept this request.');
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

      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchField}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination"
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
        <View style={styles.searchField}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={date}
            onChangeText={setDate}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={Colors.textDisabled}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={14} color={Colors.textWhite} />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
          {(destination || date) ? (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearSearch}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Sort controls */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort:</Text>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'date' && styles.sortChipActive]}
          onPress={() => toggleSortBy('date')}
        >
          <Text style={[styles.sortChipText, sortBy === 'date' && styles.sortChipTextActive]}>Date</Text>
          {sortBy === 'date' && (
            <Ionicons
              name={order === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={Colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'passengers' && styles.sortChipActive]}
          onPress={() => toggleSortBy('passengers')}
        >
          <Text style={[styles.sortChipText, sortBy === 'passengers' && styles.sortChipTextActive]}>Passengers</Text>
          {sortBy === 'passengers' && (
            <Ionicons
              name={order === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={Colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
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
                {/* Luggage declaration */}
                {req.luggageDeclaration && req.luggageDeclaration !== 'None' && (
                  <View style={styles.stopsRow}>
                    <Ionicons name="briefcase-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>Luggage: {req.luggageDeclaration}</Text>
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

      {/* Merge requests modal */}
      {mergeModal && (
        <MergeRequestsModal
          visible={!!mergeModal}
          offerRideId={mergeModal.offerRideId}
          candidates={mergeModal.candidates}
          availableSeats={mergeModal.availableSeats}
          onClose={() => setMergeModal(null)}
          onMergeConfirmed={() => {
            setMergeModal(null);
            fetchRequests();
          }}
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
  searchBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    height: 40,
    backgroundColor: Colors.background,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  searchBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textWhite,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortLabel: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sortChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  sortChipText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  sortChipTextActive: {
    color: Colors.primary,
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
