import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const RIDE = {
  id: '3001',
  departure: 'AUI Main Gate',
  destination: 'Fez Airport',
  departureTime: '14:00',
  distance: '65 km',
  duration: '~55 min',
  driver: { name: 'Ghita Nafa', initials: 'GN', rating: 4.8, rides: 23 },
  vehicle: { brand: 'Dacia', model: 'Logan', color: 'White', plate: '12345-AB-67', size: 'Medium', luggage: 3 },
  totalSeats: 4,
  availableSeats: 2,
  price: 50,
  smoking: false,
  drivingStyle: 'Calm driver',
  genderPref: 'All',
  stops: ['Ifrane Marché', 'Hay Riad'],
};

function SectionCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export default function RideDetailsScreen({ navigation }) {
  const [selectedStop, setSelectedStop] = useState(null);

  const handleShare = () => Share.share({ message: `Ride to ${RIDE.destination} at ${RIDE.departureTime} - AUI Carpool` });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Route Card */}
        <SectionCard style={{ marginTop: Spacing.lg }}>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <View style={styles.dashedLine} />
              <View style={[styles.dot, { backgroundColor: Colors.error }]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeStop}>{RIDE.departure}</Text>
              <Text style={styles.routeStop}>{RIDE.destination}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            {[
              { icon: 'time-outline', val: RIDE.departureTime, label: 'Departure' },
              { icon: 'map-outline', val: RIDE.distance, label: 'Distance' },
              { icon: 'timer-outline', val: RIDE.duration, label: 'Est. time' },
            ].map((s, i) => (
              <View key={i} style={styles.statCol}>
                <Ionicons name={s.icon} size={16} color={Colors.textSecondary} />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Driver Card */}
        <SectionCard>
          <View style={styles.driverRow}>
            <View style={styles.avatarMd}>
              <Text style={styles.avatarText}>{RIDE.driver.initials}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{RIDE.driver.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.ratingText}>{RIDE.driver.rating} · {RIDE.driver.rides} rides</Text>
              </View>
            </View>
          </View>
          <View style={styles.prefTags}>
            <View style={[styles.tag, styles.tagGreen]}>
              <Ionicons name="ban-outline" size={12} color={Colors.primary} />
              <Text style={[styles.tagText, { color: Colors.primary }]}>Non-smoking</Text>
            </View>
            <View style={[styles.tag, styles.tagGray]}>
              <Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary} />
              <Text style={[styles.tagText, { color: Colors.textSecondary }]}>{RIDE.drivingStyle}</Text>
            </View>
          </View>
        </SectionCard>

        {/* Vehicle Card */}
        <SectionCard>
          <View style={styles.vehicleRow}>
            <Ionicons name="car-outline" size={20} color={Colors.textSecondary} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={styles.vehicleMain}>{RIDE.vehicle.brand} {RIDE.vehicle.model} · {RIDE.vehicle.color}</Text>
              <Text style={styles.vehicleSub}>{RIDE.vehicle.size} · {RIDE.vehicle.luggage} luggage spots</Text>
            </View>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{RIDE.vehicle.plate}</Text>
            </View>
          </View>
        </SectionCard>

        {/* Seats Card */}
        <SectionCard>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Available Seats</Text>
            <Text style={styles.seatsCount}>{RIDE.availableSeats} of {RIDE.totalSeats} remaining</Text>
          </View>
          <View style={styles.seatsIcons}>
            {Array.from({ length: RIDE.totalSeats }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < (RIDE.totalSeats - RIDE.availableSeats) ? 'person' : 'person-outline'}
                size={22}
                color={i < (RIDE.totalSeats - RIDE.availableSeats) ? Colors.primary : Colors.border}
                style={{ marginRight: 8 }}
              />
            ))}
          </View>
          <Text style={styles.priceNote}>{RIDE.price} MAD per seat</Text>
        </SectionCard>

        {/* Map Thumbnail */}
        <View style={styles.mapThumb}>
          <Ionicons name="map-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.mapThumbText}>View full route</Text>
        </View>

        {/* Stops Card */}
        <SectionCard>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Route & Stops</Text>
            <Text style={styles.stopsCount}>{RIDE.stops.length} stops set</Text>
          </View>
          <Text style={styles.stopsHint}>Stops offered by the driver</Text>
          <View style={styles.stopsList}>
            {[RIDE.departure, ...RIDE.stops, RIDE.destination].map((stop, i, arr) => (
              <View key={stop} style={styles.stopItem}>
                <View style={[styles.stopDot, {
                  backgroundColor: i === 0 || i === arr.length - 1 ? Colors.primary : Colors.border,
                  borderColor: i === 0 || i === arr.length - 1 ? Colors.primary : Colors.textSecondary,
                }]} />
                <Text style={[styles.stopLabel, {
                  color: i === 0 || i === arr.length - 1 ? Colors.textPrimary : Colors.textSecondary,
                  fontFamily: i === 0 || i === arr.length - 1 ? 'Inter_600SemiBold' : 'Inter_400Regular',
                }]}>{stop}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.stopsFootnote}>You'll select your stop when booking</Text>
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.msgBtn} onPress={() => {}}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
          <Text style={styles.msgBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('BookRide', { ride: RIDE })}
        >
          <Text style={styles.bookBtnText}>Book Now · {RIDE.price} MAD</Text>
        </TouchableOpacity>
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
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  routeDots: { alignItems: 'center', marginRight: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dashedLine: { width: 2, height: 28, backgroundColor: Colors.border, marginVertical: 3 },
  routeLabels: { flex: 1, justifyContent: 'space-between', height: 48 },
  routeStop: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statCol: { alignItems: 'center', gap: 3 },
  statVal: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginTop: 2 },
  statLabel: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatarMd: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.primary },
  driverInfo: { marginLeft: Spacing.md, flex: 1 },
  driverName: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  ratingText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  prefTags: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  tagGreen: { backgroundColor: Colors.primaryBg },
  tagGray: { backgroundColor: Colors.background },
  tagText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleMain: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  vehicleSub: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  plateBadge: {
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border,
  },
  plateText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardLabel: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  seatsCount: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  seatsIcons: { flexDirection: 'row', marginVertical: Spacing.sm },
  priceNote: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: Spacing.xs },
  mapThumb: {
    height: 110, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  mapThumbText: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textWhite },
  stopsCount: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  stopsHint: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginBottom: Spacing.sm },
  stopsList: { gap: 12, marginVertical: Spacing.sm },
  stopItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  stopLabel: { fontSize: Typography.base, flex: 1 },
  stopsFootnote: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: Spacing.xs },
  bottomBar: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg,
    paddingBottom: Spacing.xl, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, height: 50, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  msgBtnText: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  bookBtn: {
    flex: 1, height: 50, backgroundColor: Colors.primary,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },
  bookBtnText: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
