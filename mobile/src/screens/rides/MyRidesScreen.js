import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getMyRides } from '../../services/rideService';
import { getCurrentBookings, getBookingHistory } from '../../services/bookingService';

// Data fetched from API — see useEffect below

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
  const { user, isDriver } = useAuth();
  const [role, setRole] = useState(isDriver ? 'Driver' : 'Passenger');
  const [tab, setTab] = useState('upcoming');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (role === 'Passenger') {
        if (tab === 'upcoming') {
          const res = await getCurrentBookings();
          // Map bookings to the card shape
          setData((res.data?.bookings || []).map(b => {
            const r = b.rideId || {};
            const d = r.driverId || {};
            return {
              id: b._id, from: r.departureLocation || '—', to: r.destination || '—',
              date: r.departureDateTime ? new Date(r.departureDateTime).toLocaleDateString() : '—',
              time: r.departureDateTime ? new Date(r.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              cost: r.pricePerSeat * b.seatsCount, status: 'upcoming',
              driver: `${d.firstName || ''} ${(d.lastName || '')[0] || ''}.`,
              driverInitials: ((d.firstName?.[0] || '') + (d.lastName?.[0] || '')).toUpperCase(),
              driverRating: d.averageRating || 0,
              rideId: r._id,
            };
          }));
        } else {
          const res = await getBookingHistory();
          setData((res.data?.bookings || []).map(b => {
            const r = b.rideId || {};
            const d = r.driverId || {};
            return {
              id: b._id, from: r.departureLocation || '—', to: r.destination || '—',
              date: r.departureDateTime ? new Date(r.departureDateTime).toLocaleDateString() : '—',
              time: r.departureDateTime ? new Date(r.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              cost: r.pricePerSeat ? r.pricePerSeat * b.seatsCount : 0,
              status: b.status?.toLowerCase() === 'confirmed' ? 'upcoming' : b.status?.toLowerCase() || 'completed',
              driver: `${d.firstName || ''} ${(d.lastName || '')[0] || ''}.`,
              driverInitials: ((d.firstName?.[0] || '') + (d.lastName?.[0] || '')).toUpperCase(),
              driverRating: d.averageRating || 0,
              rated: false, rideId: r._id,
            };
          }));
        }
      } else {
        // Driver view
        const res = await getMyRides(tab === 'upcoming' ? 'upcoming' : 'past');
        setData((res.data?.rides || []).map(r => {
          const v = r.vehicleId || {};
          return {
            id: r._id, from: r.departureLocation, to: r.destination,
            date: new Date(r.departureDateTime).toLocaleDateString(),
            time: new Date(r.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: r.pricePerSeat,
            status: ['Active', 'Full'].includes(r.status) ? 'upcoming' : r.status?.toLowerCase() || 'completed',
            passengers: r.totalSeats - r.availableSeats, totalSeats: r.totalSeats,
            rideId: r._id,
          };
        }));
      }
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [role, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rides</Text>
        {/* Role toggle — only for drivers */}
        {isDriver && (
        <View style={styles.roleToggle}>
          {['Passenger', 'Driver'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => { setRole(r); setTab('upcoming'); }}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}
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
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 40 }} />
        ) : data.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyText}>No {tab} rides</Text>
          </View>
        ) : data.map(ride => (
          role === 'Passenger'
            ? <PassengerRideCard key={ride.id} ride={ride} navigation={navigation} />
            : <DriverRideCard    key={ride.id} ride={ride} navigation={navigation} />
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {role === 'Passenger' ? (
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
  headerTitle: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  roleToggle: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 2 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm - 2 },
  roleBtnActive: { backgroundColor: Colors.surface, ...Shadows.sm },
  roleBtnText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  roleBtnTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary },
  tabTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
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
  routeCity: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary, lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold' },
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverChip: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  driverAvatarText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  driverName: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  driverRating: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginLeft: 2 },
  passengerChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  passengerText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnAccent: { borderColor: Colors.accent },
  actionBtnText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  ctaBtnText: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
});
