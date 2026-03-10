import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const PASSENGER_UPCOMING = [
  {
    id: '1', from: 'AUI Main Gate', to: 'Fez Airport', date: 'Today', time: '14:00',
    cost: 50, status: 'upcoming', driver: 'Ghita N.', driverInitials: 'GN', driverRating: 4.8,
  },
  {
    id: '2', from: 'AUI Main Gate', to: 'Rabat', date: 'Feb 25', time: '09:00',
    cost: 100, status: 'upcoming', driver: 'Ahmed B.', driverInitials: 'AB', driverRating: 4.6,
  },
];

const PASSENGER_PAST = [
  {
    id: '3', from: 'AUI Main Gate', to: 'Meknes', date: 'Feb 10', time: '15:30',
    cost: 40, status: 'completed', driver: 'Kenza N.', driverInitials: 'KN', driverRating: 4.9, rated: false,
  },
  {
    id: '4', from: 'Casablanca', to: 'AUI Main Gate', date: 'Jan 28', time: '10:00',
    cost: 120, status: 'cancelled', driver: 'Omar S.', driverInitials: 'OS', driverRating: 4.2, rated: true,
  },
];

const DRIVER_UPCOMING = [
  {
    id: '1', from: 'AUI Main Gate', to: 'Fez', date: 'Today', time: '14:00',
    price: 50, status: 'upcoming', passengers: 3, totalSeats: 4,
  },
  {
    id: '2', from: 'AUI Main Gate', to: 'Rabat', date: 'Feb 25', time: '09:00',
    price: 100, status: 'upcoming', passengers: 2, totalSeats: 4,
  },
];

const DRIVER_PAST = [
  {
    id: '3', from: 'AUI Main Gate', to: 'Meknes', date: 'Feb 10', time: '15:30',
    price: 40, status: 'completed', passengers: 4, totalSeats: 4,
  },
];

const STATUS_STYLES = {
  upcoming:  { bg: Colors.primaryBg,   text: Colors.primary,        label: 'Upcoming' },
  completed: { bg: Colors.background,  text: Colors.textSecondary,  label: 'Completed' },
  cancelled: { bg: '#FEF2F2',          text: Colors.error,          label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.completed;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function PassengerRideCard({ ride, navigation }) {
  const isPast = ride.status !== 'upcoming';
  return (
    <View style={styles.rideCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <View style={styles.routeDotRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeCity}>{ride.from}</Text>
            <Text style={styles.routeCity}>{ride.to}</Text>
          </View>
        </View>
        <StatusBadge status={ride.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.cost} MAD</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.driverChip}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{ride.driverInitials}</Text>
          </View>
          <Text style={styles.driverName}>{ride.driver}</Text>
          <Ionicons name="star" size={11} color={Colors.accent} style={{ marginLeft: 4 }} />
          <Text style={styles.driverRating}>{ride.driverRating}</Text>
        </View>
        {!isPast ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('RideDetails')}>
            <Text style={styles.actionBtnText}>View Details</Text>
          </TouchableOpacity>
        ) : ride.status === 'completed' && !ride.rated ? (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAccent]}>
            <Ionicons name="star-outline" size={12} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Rate Ride</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function DriverRideCard({ ride, navigation }) {
  const isPast = ride.status !== 'upcoming';
  return (
    <View style={styles.rideCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <View style={styles.routeDotRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeCity}>{ride.from}</Text>
            <Text style={styles.routeCity}>{ride.to}</Text>
          </View>
        </View>
        <StatusBadge status={ride.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.price} MAD</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.passengerChip}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.passengerText}>{ride.passengers}/{ride.totalSeats} passengers · Booked</Text>
        </View>
        {!isPast && (
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MyRidesScreen({ navigation }) {
  const [role, setRole] = useState('passenger'); // 'passenger' | 'driver'
  const [tab, setTab] = useState('upcoming');    // 'upcoming' | 'past'

  const upcomingData = role === 'passenger' ? PASSENGER_UPCOMING : DRIVER_UPCOMING;
  const pastData     = role === 'passenger' ? PASSENGER_PAST     : DRIVER_PAST;
  const currentData  = tab === 'upcoming' ? upcomingData : pastData;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rides</Text>
        {/* Role toggle */}
        <View style={styles.roleToggle}>
          {['passenger', 'driver'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => { setRole(r); setTab('upcoming'); }}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['upcoming', 'past'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg }}>
        {currentData.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyText}>No {tab} rides</Text>
          </View>
        ) : currentData.map(ride => (
          role === 'passenger'
            ? <PassengerRideCard key={ride.id} ride={ride} navigation={navigation} />
            : <DriverRideCard    key={ride.id} ride={ride} navigation={navigation} />
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {role === 'passenger' ? (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="search-outline" size={16} color={Colors.textWhite} />
            <Text style={styles.ctaBtnText}>Find a Ride</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('CreateRide')}>
            <Ionicons name="add" size={16} color={Colors.textWhite} />
            <Text style={styles.ctaBtnText}>Post a Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  roleToggle: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 2 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm - 2 },
  roleBtnActive: { backgroundColor: Colors.surface, ...Shadows.sm },
  roleBtnText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  roleBtnTextActive: { fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.md, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  tabTextActive: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  scroll: { flex: 1 },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  routeBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.sm },
  routeDotRow: { alignItems: 'center', marginRight: Spacing.sm },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1.5, height: 16, backgroundColor: Colors.border, marginVertical: 2 },
  routeCity: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary, lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverChip: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  driverAvatarText: { fontSize: Typography.xs, fontFamily: 'Inter_700Bold', color: Colors.primary },
  driverName: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  driverRating: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginLeft: 2 },
  passengerChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  passengerText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnAccent: { borderColor: Colors.accent },
  actionBtnText: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  ctaBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
