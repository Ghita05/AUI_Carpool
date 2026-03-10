import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const RIDE = {
  departure: 'AUI Main Gate', destination: 'Fez Airport',
  departureTime: '14:00', driver: 'Ghita Nafa', vehicle: 'Dacia Logan', vehicleSize: 'Medium',
  availableSeats: 4, price: 50,
  stops: ['AUI Main Gate', 'Ifrane Marché', 'Hay Riad'],
};

const LUGGAGE_OPTIONS = ['No luggage', '1 small bag', '1 suitcase', '2+ bags'];

function SectionCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export default function BookRideScreen({ navigation }) {
  const [seats, setSeats] = useState(1);
  const [selectedStop, setSelectedStop] = useState(RIDE.stops[0]);
  const [luggage, setLuggage] = useState('1 suitcase');

  const total = seats * RIDE.price;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Ride Summary */}
        <SectionCard style={{ marginTop: Spacing.lg }}>
          <View style={styles.summaryRoute}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <Text style={styles.summaryRouteText}>{RIDE.departure} → {RIDE.destination}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryStats}>
            {[
              { icon: 'time-outline', val: RIDE.departureTime, label: 'Departure' },
              { icon: 'person-outline', val: RIDE.driver.split(' ')[0], label: 'Driver' },
              { icon: 'car-outline', val: RIDE.vehicle.split(' ')[1], label: 'Vehicle' },
            ].map((s, i) => (
              <View key={i} style={styles.statCol}>
                <Ionicons name={s.icon} size={13} color={Colors.textSecondary} />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Seats */}
        <SectionCard>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Number of Seats</Text>
            <Text style={styles.subLabel}>{RIDE.availableSeats} available</Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepBtn, seats <= 1 && styles.stepBtnDisabled]}
              onPress={() => seats > 1 && setSeats(s => s - 1)}
            >
              <Ionicons name="remove" size={16} color={seats <= 1 ? Colors.textDisabled : Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.stepperVal}>{seats}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, seats >= RIDE.availableSeats && styles.stepBtnDisabled]}
              onPress={() => seats < RIDE.availableSeats && setSeats(s => s + 1)}
            >
              <Ionicons name="add" size={16} color={seats >= RIDE.availableSeats ? Colors.textDisabled : Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.seatsIcons}>
            {Array.from({ length: RIDE.availableSeats }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < seats ? 'person' : 'person-outline'}
                size={20}
                color={i < seats ? Colors.primary : Colors.border}
                style={{ marginRight: 8 }}
              />
            ))}
          </View>
        </SectionCard>

        {/* Stop Selection */}
        <SectionCard>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Your Stop</Text>
            <Text style={styles.subLabel}>{RIDE.stops.length} stops available</Text>
          </View>
          <Text style={styles.stopsHint}>Select where you want to board</Text>
          <View style={styles.pillsRow}>
            {RIDE.stops.map(stop => (
              <TouchableOpacity
                key={stop}
                style={[styles.pill, selectedStop === stop && styles.pillActive]}
                onPress={() => setSelectedStop(stop)}
              >
                <Text style={[styles.pillText, selectedStop === stop && styles.pillTextActive]}>{stop}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.suggestRow}>
            <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.suggestText}>Suggest a different stop</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Luggage Declaration */}
        <SectionCard>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Luggage</Text>
            <Text style={[styles.subLabel, { color: Colors.error }]}>Required</Text>
          </View>
          <View style={styles.luggageGrid}>
            {LUGGAGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.lugPill, luggage === opt && styles.lugPillActive]}
                onPress={() => setLuggage(opt)}
              >
                <Text style={[styles.lugPillText, luggage === opt && styles.lugPillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.luggageHint}>Drivers need to plan space in advance</Text>
        </SectionCard>

        {/* Price Summary */}
        <SectionCard>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{seats} seat{seats > 1 ? 's' : ''}</Text>
            <Text style={styles.priceVal}>{seats * RIDE.price} MAD</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { fontFamily: 'Inter_700Bold', color: Colors.textPrimary, fontSize: Typography.lg }]}>Total</Text>
            <Text style={styles.totalVal}>{total} MAD</Text>
          </View>
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => navigation.navigate('BookingConfirmation', { seats, stop: selectedStop, luggage, total })}
        >
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
        <Text style={styles.confirmNote}>You won't be charged until the driver confirms</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.card,
  },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  summaryRouteText: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  statCol: { alignItems: 'center', gap: 3 },
  statVal: { fontSize: Typography.base, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginTop: 2 },
  statLabel: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardLabel: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  subLabel: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, marginBottom: Spacing.sm },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepperVal: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, minWidth: 32, textAlign: 'center' },
  seatsIcons: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xs },
  stopsHint: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginBottom: Spacing.sm },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    paddingHorizontal: 14, height: 36, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  pillText: { fontSize: Typography.base, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary, fontFamily: 'Inter_700Bold' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  suggestText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  luggageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  lugPill: {
    paddingHorizontal: 14, height: 36, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  lugPillActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  lugPillText: { fontSize: Typography.base, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  lugPillTextActive: { color: Colors.primary, fontFamily: 'Inter_700Bold' },
  luggageHint: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  priceVal: { fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  totalVal: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold', color: Colors.primary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  confirmBtn: {
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  confirmBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
  confirmNote: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
});
