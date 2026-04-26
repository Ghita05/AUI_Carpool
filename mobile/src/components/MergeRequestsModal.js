import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { mergeRideRequests } from '../services/rideService';

/**
 * MergeRequestsModal
 *
 * Shows after a driver accepts a request when there are other identical open
 * requests (same departure, destination, datetime, stops).  The driver can
 * select which of those requests to merge into the just-created offer ride.
 *
 * Props:
 *   visible         – boolean
 *   offerRideId     – string  (the newly created offer ride's _id)
 *   candidates      – array of { requestId, passenger, passengerCount, luggageDeclaration, maxPrice, stops }
 *   availableSeats  – number  (remaining seats in the offer ride)
 *   onClose         – () => void
 *   onMergeConfirmed– () => void  (called after successful merge)
 */
export default function MergeRequestsModal({
  visible,
  offerRideId,
  candidates = [],
  availableSeats = 0,
  onClose,
  onMergeConfirmed,
}) {
  const [selected, setSelected] = useState({}); // { [requestId]: bool }
  const [merging, setMerging] = useState(false);
  const [localVisible, setLocalVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(400);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, mass: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => setLocalVisible(false));
    }
  }, [visible]);

  const selectedCount = candidates
    .filter(c => selected[c.requestId])
    .reduce((sum, c) => sum + (c.passengerCount || 1), 0);

  const seatsAfter = availableSeats - selectedCount;
  const overCapacity = seatsAfter < 0;

  const toggleSelect = (requestId, passengerCount) => {
    const willBeSelected = !selected[requestId];
    const projectedTotal = selectedCount + (willBeSelected ? (passengerCount || 1) : -(passengerCount || 1));
    if (willBeSelected && projectedTotal > availableSeats) {
      Alert.alert('Seat limit', `Only ${availableSeats} seat(s) remain. Selecting this request would exceed that.`);
      return;
    }
    setSelected(prev => ({ ...prev, [requestId]: willBeSelected }));
  };

  const handleMerge = async () => {
    const toMerge = candidates.filter(c => selected[c.requestId]).map(c => c.requestId);
    if (toMerge.length === 0) {
      Alert.alert('No selection', 'Please select at least one request to merge, or dismiss.');
      return;
    }
    setMerging(true);
    try {
      const res = await mergeRideRequests(offerRideId, toMerge);
      const warnings = res?.data?.luggageWarnings || [];
      if (warnings.length > 0) {
        const msg = warnings
          .map(w => `• ${w.passengerName}: ${w.declared} luggage (vehicle capacity: ${w.vehicleCapacity})`)
          .join('\n');
        Alert.alert('Luggage Advisory', `The following passengers declared luggage that may exceed your vehicle capacity:\n\n${msg}\n\nIt is your responsibility to make the necessary arrangements.`);
      }
      onMergeConfirmed?.();
    } catch (err) {
      Alert.alert('Merge failed', err?.response?.data?.message || 'Could not complete the merge.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Modal visible={localVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Similar Open Requests</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            There {candidates.length === 1 ? 'is' : 'are'} {candidates.length} other open request{candidates.length !== 1 ? 's' : ''} with the same route and time.
            {'\n'}Select which ones to add to your ride ({availableSeats} seat{availableSeats !== 1 ? 's' : ''} remaining).
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {candidates.map((c) => {
              const isSelected = !!selected[c.requestId];
              const name = c.passenger
                ? `${c.passenger.firstName || ''} ${c.passenger.lastName || ''}`.trim()
                : 'Passenger';
              return (
                <TouchableOpacity
                  key={c.requestId}
                  style={[styles.candidateRow, isSelected && styles.candidateRowSelected]}
                  onPress={() => toggleSelect(c.requestId, c.passengerCount)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{name}</Text>
                    <View style={styles.candidateMeta}>
                      <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.candidateMetaText}>{c.passengerCount || 1} passenger{(c.passengerCount || 1) !== 1 ? 's' : ''}</Text>
                      {c.luggageDeclaration && c.luggageDeclaration !== 'None' && (
                        <>
                          <Ionicons name="briefcase-outline" size={12} color={Colors.textSecondary} style={{ marginLeft: 10 }} />
                          <Text style={styles.candidateMetaText}>{c.luggageDeclaration} luggage</Text>
                        </>
                      )}
                      {c.maxPrice ? (
                        <>
                          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} style={{ marginLeft: 10 }} />
                          <Text style={styles.candidateMetaText}>{c.maxPrice} MAD</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Seat counter */}
          <View style={[styles.seatBar, overCapacity && styles.seatBarError]}>
            <Ionicons
              name={overCapacity ? 'warning-outline' : 'car-outline'}
              size={14}
              color={overCapacity ? Colors.error : Colors.primary}
            />
            <Text style={[styles.seatBarText, overCapacity && styles.seatBarTextError]}>
              {overCapacity
                ? `Over capacity by ${Math.abs(seatsAfter)} seat(s)`
                : `${seatsAfter} seat(s) will remain after merge`}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose} disabled={merging}>
              <Text style={styles.dismissBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mergeBtn, (overCapacity || merging) && styles.mergeBtnDisabled]}
              onPress={handleMerge}
              disabled={overCapacity || merging}
            >
              {merging
                ? <ActivityIndicator size="small" color={Colors.textWhite} />
                : <Text style={styles.mergeBtnText}>Confirm Merge</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 0,
    maxHeight: 320,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 10,
  },
  candidateRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  candidateName: {
    fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  candidateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  candidateMetaText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
  },
  seatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  seatBarError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  seatBarText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.primary,
  },
  seatBarTextError: {
    color: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  mergeBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergeBtnDisabled: {
    opacity: 0.5,
  },
  mergeBtnText: {
    fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textWhite,
  },
});
