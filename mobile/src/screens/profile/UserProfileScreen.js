import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getUserReviews } from '../../services/reviewService';

function StarRow({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={i <= rating ? Colors.accent : Colors.border}
        />
      ))}
    </View>
  );
}

// Maps a raw review document (with populated authorId) into a display shape.
// authorId is populated by the backend as a full user object.
function mapReview(r) {
  const author = r.authorId || {};
  const initials = ((author.firstName?.[0] || '') + (author.lastName?.[0] || '')).toUpperCase() || '??';
  const name = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'AUI Member';
  return {
    _id: r._id,
    initials,
    name,
    rating: r.rating || 0,
    content: r.content || '',
    date: r.date ? new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
    authorId: author._id || r.authorId,
  };
}

function ReviewCard({ review }) {
  return (
    <View style={st.reviewCard}>
      <View style={st.reviewTop}>
        <View style={st.reviewAvatar}>
          <Text style={st.reviewAvatarText}>{review.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.reviewAuthor}>{review.name}</Text>
          <StarRow rating={review.rating} size={11} />
        </View>
        <Text style={st.reviewDate}>{review.date}</Text>
      </View>
      {!!review.content && <Text style={st.reviewText}>{review.content}</Text>}
    </View>
  );
}

export default function UserProfileScreen({ navigation }) {
  const { user, isDriver, logout } = useAuth();
  const [tab, setTab] = useState('received');
  // received: reviews others left for this user
  const [received, setReceived] = useState([]);
  // given: reviews this user left for others — fetched separately
  const [given, setGiven] = useState([]);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingGiven, setLoadingGiven] = useState(false);

  const fetchReceived = useCallback(async () => {
    if (!user?._id) return;
    setLoadingReceived(true);
    try {
      const res = await getUserReviews(user._id);
      setReceived((res.data?.reviews || []).map(mapReview));
    } catch {
      setReceived([]);
    } finally {
      setLoadingReceived(false);
    }
  }, [user?._id]);

  // Reviews written by this user require a backend endpoint we don't have yet
  // (getGivenReviews). When the tab switches to "given", we show an appropriate
  // empty state rather than crashing or showing wrong data.
  const fetchGiven = useCallback(async () => {
    if (!user?._id) return;
    setLoadingGiven(true);
    // TODO: wire to a dedicated "reviews I wrote" endpoint when available
    setGiven([]);
    setLoadingGiven(false);
  }, [user?._id]);

  useFocusEffect(useCallback(() => { fetchReceived(); }, [fetchReceived]));

  useEffect(() => {
    if (tab === 'given') fetchGiven();
  }, [tab, fetchGiven]);

  const handleLogout = () => {
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  // Real user fields from the API — with safe fallbacks
  const avgRating = user?.averageRating ?? '—';
  const totalRides = user?.totalCompletedRides ?? 0;
  const cancels = user?.cancellationCount ?? 0;
  const smokingPref = user?.smokingPreference || null;
  const drivingPref = user?.drivingStyle || null;

  const displayReviews = tab === 'received' ? received : given;
  const isLoading = tab === 'received' ? loadingReceived : loadingGiven;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={st.profileHeader}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{user?.initials || '??'}</Text>
          </View>
          <Text style={st.name}>{user?.firstName} {user?.lastName}</Text>
          <View style={st.emailRow}>
            <Ionicons name="mail-outline" size={13} color={Colors.textSecondary} />
            <Text style={st.email}>{user?.email || ''}</Text>
          </View>
          <View style={st.roleBadge}>
            <Text style={st.roleText}>{isDriver ? 'Driver' : 'Passenger'}</Text>
          </View>
        </View>

        {/* Stats — real fields from API user object */}
        <View style={st.statsRow}>
          <View style={st.statItem}>
            <Text style={st.statBig}>{avgRating}</Text>
            <Text style={st.statLabel}>Rating</Text>
          </View>
          <View style={[st.statItem, st.statBorder]}>
            <Text style={st.statBig}>{totalRides}</Text>
            <Text style={st.statLabel}>Rides</Text>
          </View>
          <View style={st.statItem}>
            <Text style={st.statBig}>{cancels}</Text>
            <Text style={st.statLabel}>Cancels</Text>
          </View>
        </View>

        {/* Preferences — from actual user object, hidden if not set */}
        {(smokingPref || drivingPref) && (
          <View style={st.card}>
            <Text style={st.cardTitle}>Preferences</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {smokingPref && (
                <View style={st.chip}>
                  <Ionicons name="ban-outline" size={12} color={Colors.primary} />
                  <Text style={st.chipText}>{smokingPref}</Text>
                </View>
              )}
              {isDriver && drivingPref && (
                <View style={[st.chip, { backgroundColor: Colors.background }]}>
                  <Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary} />
                  <Text style={[st.chipText, { color: Colors.textSecondary }]}>{drivingPref}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={st.card}>
          <Text style={st.cardTitle}>
            Reviews {received.length > 0 ? `(${received.length})` : ''}
          </Text>
          <View style={st.tabRow}>
            {['received', 'given'].map(t => (
              <TouchableOpacity
                key={t}
                style={[st.tab, tab === t && st.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[st.tabText, tab === t && st.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 20 }} />
          ) : displayReviews.length === 0 ? (
            <View style={st.emptyReviews}>
              <Ionicons name="star-outline" size={28} color={Colors.border} />
              <Text style={st.emptyReviewsText}>
                {tab === 'received'
                  ? 'No reviews yet'
                  : 'Reviews you write after rides will appear here'}
              </Text>
            </View>
          ) : (
            displayReviews.map(r => <ReviewCard key={r._id} review={r} />)
          )}
        </View>

        {/* Actions */}
        <View style={st.card}>
          <TouchableOpacity style={st.menuRow} onPress={() => navigation.navigate('AccountSettings')}>
            <Ionicons name="settings-outline" size={18} color={Colors.textPrimary} />
            <Text style={st.menuText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={st.menuDivider} />
          <TouchableOpacity style={st.menuRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={[st.menuText, { color: Colors.error }]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  profileHeader: {
    alignItems: 'center', paddingVertical: Spacing['2xl'],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  name: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  email: { fontSize: Typography.sm, color: Colors.textSecondary },
  roleBadge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.full,
  },
  roleText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: Radius.md, ...Shadows.card,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.divider },
  statBig: { fontSize: Typography['3xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.lg, ...Shadows.card,
  },
  cardTitle: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, backgroundColor: Colors.primaryBg,
  },
  chipText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
  tabRow: {
    flexDirection: 'row', marginTop: 12, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  emptyReviews: { alignItems: 'center', paddingVertical: 24, gap: Spacing.sm },
  emptyReviewsText: {
    fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary, textAlign: 'center',
  },
  reviewCard: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  reviewAuthor: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  reviewDate: { fontSize: 10, color: Colors.textSecondary },
  reviewText: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 14,
  },
  menuText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary },
  menuDivider: { height: 1, backgroundColor: Colors.divider },
});
