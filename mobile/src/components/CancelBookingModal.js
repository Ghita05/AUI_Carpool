import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { cancelBooking } from '../services/bookingService';

export default function CancelBookingModal({ visible, booking, ride, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!booking || !ride) {
      Alert.alert('Error', 'Booking information not available.');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure? You'll lose your seat and the driver will be notified.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const reasonToSend = reason.trim() || 'Cancelled by passenger';
              await cancelBooking(booking._id, reasonToSend);
              setReason('');
              onClose();
              Alert.alert('✓ Cancelled', 'Your booking has been cancelled. The driver was notified.');
              if (onCancelled) onCancelled();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!booking || !ride) return null;

  const departureTime = new Date(ride.departureDateTime);
  const formattedDate = departureTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Booking</Text>
            <TouchableOpacity onPress={handleClose} disabled={cancelling}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Ride Summary Card */}
            <View style={styles.rideCard}>
              <View style={styles.routeBlock}>
                <View style={styles.routeColumn}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeLine} />
                  <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.cityName}>{ride.departureLocation}</Text>
                  <Text style={styles.arrow}>↓</Text>
                  <Text style={styles.cityName}>{ride.destination}</Text>
                </View>
              </View>

              <View style={styles.rideDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>{formattedDate}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detailText}>{formattedTime}</Text>
                </View>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Why cancel?</Text>
                <Text style={styles.infoText}>
                  Let the driver know what happened so they can plan accordingly
                </Text>
              </View>
            </View>

            {/* Reason Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cancellation Reason</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Plans changed, found another ride..."
                placeholderTextColor={Colors.textDisabled}
                multiline
                numberOfLines={3}
                editable={!cancelling}
              />
              <Text style={styles.helperText}>Optional</Text>
            </View>

            {/* Consequences */}
            <View style={styles.consequencesBox}>
              <Text style={styles.consequencesTitle}>What happens next?</Text>
              <View style={styles.consequenceRow}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={styles.consequenceText}>Seat becomes available for others</Text>
              </View>
              <View style={styles.consequenceRow}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
                <Text style={styles.consequenceText}>Driver receives cancellation notice</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={handleClose}
              disabled={cancelling}
            >
              <Text style={styles.keepBtnText}>Keep It</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
              onPress={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    height: 60,
  },
  title: {
    fontSize: Typography['2xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'scroll',
  },
  
  // Ride Card
  rideCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  routeBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  routeColumn: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  routeInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
  },
  arrow: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginVertical: 2,
  },
  rideDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoTitle: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.primary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    lineHeight: 15,
  },

  // Form
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textDisabled,
  },

  // Consequences
  consequencesBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  consequencesTitle: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  consequenceRow_last: {
    marginBottom: 0,
  },
  consequenceText: {
    flex: 1,
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  keepBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.primary,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  cancelBtnDisabled: {
    opacity: 0.7,
  },
  cancelBtnText: {
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#fff',
  },
});
