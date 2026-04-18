/**
 * screens/community/CommunityScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Leaderboard of top-rated verified AUI drivers, powered by the
 * GET /api/reviews/community endpoint.
 *
 * Each driver card shows:
 *   • Initials avatar + name + role badge
 *   • Star rating + total completed rides
 *   • AI-generated review summary (Gemini) if threshold met
 *   • Their #1 most frequent route + average price
 *   • Tap → full profile screen
 *
 * Accessible from the HomeScreen map via the "Community" button
 * (top-right corner of the Figma mockup 06-Map_Screen).
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { getCommunityDrivers } from '../../services/reviewService';

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 12 }) {
  const rounded = Math.round(rating * 2) / 2; // round to nearest 0.5
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= rounded ? 'star' : (i - 0.5 <= rounded ? 'star-half' : 'star-outline')}
          size={size}
          color={i <= rounded ? Colors.accent : Colors.border}
        />
      ))}
    </View>
  );
}

// ── Driver card ───────────────────────────────────────────────────────────────
function DriverCard({ driver, rank, onPress }) {
  const initials = ((driver.firstName?.[0] || '') + (driver.lastName?.[0] || '')).toUpperCase();
  const name     = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      {/* Rank badge */}
      <View style={[s.rankBadge, rank <= 3 && s.rankBadgeTop]}>
        <Text style={[s.rankText, rank <= 3 && s.rankTextTop]}>#{rank}</Text>
      </View>

      <View style={s.cardBody}>
        {/* Avatar + name */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          {rank === 1 && (
            <View style={s.crownBadge}>
              <Text style={{ fontSize: 11 }}>👑</Text>
            </View>
          )}
        </View>

        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <View style={s.ratingRow}>
            <StarRow rating={driver.averageRating} />
            <Text style={s.ratingNum}>{driver.averageRating?.toFixed(1)}</Text>
            <Text style={s.rideCount}>· {driver.totalCompletedRides} rides</Text>
          </View>

          {/* Preferences chips */}
          <View style={s.chips}>
            {driver.drivingStyle && (
              <View style={s.chip}>
                <Ionicons name="speedometer-outline" size={10} color={Colors.textSecondary} />
                <Text style={s.chipText}>{driver.drivingStyle}</Text>
              </View>
            )}
            {driver.smokingPreference && (
              <View style={s.chip}>
                <Ionicons name="ban-outline" size={10} color={Colors.textSecondary} />
                <Text style={s.chipText}>{driver.smokingPreference}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* AI review summary */}
      {driver.reviewSummary ? (
        <View style={s.summaryBox}>
          <View style={s.summaryHeader}>
            <Ionicons name="sparkles" size={12} color={Colors.primary} />
            <Text style={s.summaryLabel}>AI Summary</Text>
          </View>
          <Text style={s.summaryText} numberOfLines={3}>{driver.reviewSummary}</Text>
        </View>
      ) : null}

      {/* Top route */}
      {driver.topRoute && (
        <View style={s.routeRow}>
          <Ionicons name="navigate-outline" size={12} color={Colors.primary} />
          <Text style={s.routeText} numberOfLines={1}>
            {driver.topRoute.from?.split(',')[0]} → {driver.topRoute.to?.split(',')[0]}
          </Text>
          <Text style={s.routeMeta}>
            {driver.topRoute.count}× · avg {driver.topRoute.avgPrice} MAD
          </Text>
        </View>
      )}

      <View style={s.viewRow}>
        <Text style={s.viewText}>View profile</Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CommunityScreen({ navigation }) {
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchDrivers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);
    try {
      const res = await getCommunityDrivers(30);
      setDrivers(res.data?.drivers || []);
    } catch {
      setError('Could not load community drivers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDrivers(); }, [fetchDrivers]));

  const renderHeader = () => (
    <View style={s.header}>
      <Text style={s.headerTitle}>Community</Text>
      <Text style={s.headerSub}>Top-rated drivers in the AUI carpooling network</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.empty}>
      {error
        ? <Text style={s.errorText}>{error}</Text>
        : <>
            <Ionicons name="people-outline" size={48} color={Colors.border} />
            <Text style={s.emptyTitle}>No top drivers yet</Text>
            <Text style={s.emptySub}>Drivers will appear here once they've completed rides and received reviews.</Text>
          </>
      }
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Nav bar */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Community</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadingText}>Loading top drivers…</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={d => d._id}
          renderItem={({ item, index }) => (
            <DriverCard
              driver={item}
              rank={index + 1}
              onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDrivers(true)}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 },

  header: { marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.xl, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },

  rankBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: Colors.background,
    borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  rankBadgeTop: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  rankText:     { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textSecondary },
  rankTextTop:  { color: Colors.primary },

  cardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  crownBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: Colors.surface, borderRadius: 10,
    padding: 2,
  },

  info:      { flex: 1, paddingRight: 40 },
  name:      { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  ratingNum: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  rideCount: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.background, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipText: { fontSize: 10, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  summaryBox: {
    backgroundColor: Colors.primaryBg, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  summaryLabel:  { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary, letterSpacing: 0.3 },
  summaryText:   { fontSize: Typography.xs, color: Colors.textPrimary, lineHeight: 17, fontFamily: 'PlusJakartaSans_400Regular' },

  routeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  routeText: { flex: 1, fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  routeMeta: { fontSize: 11, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  viewText: { fontSize: Typography.xs, color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },

  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md, marginTop: 40 },
  emptyTitle: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  emptySub:   { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  errorText:  { fontSize: Typography.sm, color: Colors.error, textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular' },
});
