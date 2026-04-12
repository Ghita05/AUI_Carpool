import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { getStopRequests, respondToStopRequest } from '../services/bookingService';

export default function StopRequestsModal({ visible, rideId, onClose }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    if (visible && rideId) {
      fetchStopRequests();
    }
  }, [visible, rideId]);

  const fetchStopRequests = async () => {
    setLoading(true);
    try {
      console.log('Fetching stops for rideId:', rideId);
      const res = await getStopRequests(rideId);
      console.log('Stop requests response:', res);
      const bookings = res.data?.bookings || [];
      console.log('Parsed bookings:', bookings);
      setStops(bookings);
    } catch (err) {
      console.error('Stop requests error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load stop requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToStop = async (bookingId, approved) => {
    setRespondingId(bookingId);
    try {
      await respondToStopRequest(bookingId, approved);
      Alert.alert('Success', approved ? 'Stop request accepted' : 'Stop request rejected');
      fetchStopRequests();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to respond to stop request');
    } finally {
      setRespondingId(null);
    }
  };

  const pendingStops = stops.filter(s => s.stopStatus === 'Pending');
  const acceptedStops = stops.filter(s => s.stopStatus === 'Accepted');
  const rejectedStops = stops.filter(s => s.stopStatus === 'Rejected');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="flag" size={24} color={Colors.primary} />
              <View>
                <Text style={{ fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary }}>Stop Requests</Text>
                <Text style={{ fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary }}>{stops.length} total</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl }}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : stops.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl }}>
              <Ionicons name="flag-outline" size={40} color={Colors.textSecondary} />
              <Text style={{ fontSize: Typography.md, color: Colors.textSecondary, marginTop: Spacing.md }}>No stop requests yet</Text>
            </View>
          ) : (
            <ScrollView style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg }}>
              {/* Pending */}
              {pendingStops.length > 0 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary, marginBottom: Spacing.md }}>Pending Approval ({pendingStops.length})</Text>
                  {pendingStops.map(stop => (
                    <View key={stop._id} style={{ backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.primary }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary }}>
                            {stop.passengerId?.firstName?.[0]}{stop.passengerId?.lastName?.[0]}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }}>
                            {stop.passengerId?.firstName} {stop.passengerId?.lastName}
                          </Text>
                          <Text style={{ fontSize: Typography.sm, color: Colors.textSecondary }}>
                            {stop.passengerId?.email}
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: Colors.primaryBg, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                          <Ionicons name="location" size={14} color={Colors.primary} />
                          <Text style={{ fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary }}>Requested Stop</Text>
                        </View>
                        <Text style={{ fontSize: Typography.md, color: Colors.primary, marginLeft: 22 }}>
                          {stop.requestedStop}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error, backgroundColor: 'transparent' }}
                          onPress={() => handleRespondToStop(stop._id, false)}
                          disabled={respondingId === stop._id}
                        >
                          <Text style={{ textAlign: 'center', fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.error }}>
                            {respondingId === stop._id ? '...' : 'Reject'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary }}
                          onPress={() => handleRespondToStop(stop._id, true)}
                          disabled={respondingId === stop._id}
                        >
                          <Text style={{ textAlign: 'center', fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textWhite }}>
                            {respondingId === stop._id ? '...' : 'Accept'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Accepted */}
              {acceptedStops.length > 0 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary, marginBottom: Spacing.md }}>Accepted ({acceptedStops.length})</Text>
                  {acceptedStops.map(stop => (
                    <View key={stop._id} style={{ backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.primary, opacity: 0.7 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="checkmark" size={20} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }}>
                            {stop.passengerId?.firstName} {stop.passengerId?.lastName}
                          </Text>
                          <Text style={{ fontSize: Typography.sm, color: Colors.textSecondary }}>
                            Stop: {stop.requestedStop}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Rejected */}
              {rejectedStops.length > 0 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.error, marginBottom: Spacing.md }}>Rejected ({rejectedStops.length})</Text>
                  {rejectedStops.map(stop => (
                    <View key={stop._id} style={{ backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.error, opacity: 0.7 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="close" size={20} color={Colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }}>
                            {stop.passengerId?.firstName} {stop.passengerId?.lastName}
                          </Text>
                          <Text style={{ fontSize: Typography.sm, color: Colors.textSecondary }}>
                            Stop: {stop.requestedStop}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Footer */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <TouchableOpacity
              style={{ paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }}
              onPress={onClose}
            >
              <Text style={{ textAlign: 'center', fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
