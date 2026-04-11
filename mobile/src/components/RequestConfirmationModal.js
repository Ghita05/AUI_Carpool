import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function RequestConfirmationModal({ visible, onClose, request }) {
  if (!request) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Ionicons name="checkmark-circle" size={54} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
          <Text style={styles.title}>Request Sent!</Text>
          <Text style={styles.summary}>Your ride request has been posted. Drivers will be notified.</Text>
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}><Ionicons name="location-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>From:</Text><Text style={styles.value}>{request.departureLocation}</Text></View>
            <View style={styles.detailRow}><Ionicons name="flag-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>To:</Text><Text style={styles.value}>{request.destination}</Text></View>
            <View style={styles.detailRow}><Ionicons name="calendar-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>Date:</Text><Text style={styles.value}>{new Date(request.travelDateTime).toLocaleString()}</Text></View>
            <View style={styles.detailRow}><Ionicons name="people-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>Passengers:</Text><Text style={styles.value}>{request.passengerCount}</Text></View>
            <View style={styles.detailRow}><Ionicons name="cash-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>Max Price:</Text><Text style={styles.value}>{request.maxPrice} MAD</Text></View>
            {request.notes ? <View style={styles.detailRow}><Ionicons name="document-text-outline" size={16} color={Colors.primary} style={styles.detailIcon} /><Text style={styles.label}>Notes:</Text><Text style={styles.value}>{request.notes}</Text></View> : null}
          </View>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: Typography['2xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: Spacing.xs,
    color: Colors.primary,
    textAlign: 'center',
  },
  summary: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: Spacing.md,
  },
  detailsBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 6,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginRight: 2,
  },
  value: {
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    fontSize: Typography.md,
    marginLeft: 2,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: Typography.lg,
  },
});
