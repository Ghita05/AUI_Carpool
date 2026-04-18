/**
 * screens/profile/UserProfileScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified profile screen for both the logged-in user's own profile and any
 * other user's public profile. Accepts an optional `userId` route param —
 * if absent, it shows the current user's own profile.
 *
 * SECTIONS:
 *   1. Header — avatar, name, role, stats (rides, rating, cancellations)
 *   2. AI Review Summary — Gemini-generated paragraph (if ≥ 5 reviews)
 *   3. Travel Preferences — smoking, driving style
 *   4. Driver Route Analytics — top routes + earnings (driver only, own profile)
 *   5. Reviews tabs — Received | Given
 *   6. Actions — Edit Profile (own) | Message / Report (others)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  getUserReviews, getUserRatings, getDriverAnalytics,
} from '../../services/reviewService';
import { sendMessage } from '../../services/messageService';
import { getUserProfile } from '../../services/authService';

// ── Helpers ───────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i <= Math.round(rating) ? Colors.accent : Colors.border}
        />
      ))}
    </View>
  );
}

function mapReview(r) {
  const author  = r.authorId  || {};
  const subject = r.subjectId || {};
  const ride    = r.rideId    || {};
  return {
    _id:       r._id,
    authorId:  author._id,
    initials:  ((author.firstName?.[0] || '') + (author.lastName?.[0] || '')).toUpperCase() || '?',
    name:      `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'AUI Member',
    rating:    r.rating || 0,
    content:   r.content || '',
    date:      r.date ? new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
    route:     ride.departureLocation && ride.destination
                 ? `${ride.departureLocation.split(',')[0]} → ${ride.destination.split(',')[0]}`
                 : null,
  };
}

function ReviewCard({ review }) {
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewTop}>
        <View style={s.reviewAvatar}>
          <Text style={s.reviewAvatarText}>{review.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewAuthor}>{review.name}</Text>
          <StarRow rating={review.rating} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.reviewDate}>{review.date}</Text>
          {review.route && (
            <Text style={s.reviewRoute}>{review.route}</Text>
          )}
        </View>
      </View>
      {!!review.content && <Text style={s.reviewText}>{review.content}</Text>}
    </View>
  );
}

// ── Message modal (shown when viewing another user's profile) ─────────────────
function MessageModal({ visible, onClose, recipientName, recipientId }) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage({ receiverId: recipientId, content: text.trim() });
      Alert.alert('Sent', `Your message to ${recipientName} was sent.`);
      setText('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOv}>
        <View style={s.modalContent}>
          <View style={s.modalH}>
            <Text style={s.modalTitle}>Message {recipientName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.msgInput}
            placeholder="Write your message..."
            placeholderTextColor={Colors.textDisabled}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendBtnText}>Send Message</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function UserProfileScreen({ navigation, route }) {
  const { user: me, isDriver, logout } = useAuth();

  // If a userId is passed via route params we're viewing someone else's profile
  const paramUserId = route?.params?.userId;
  const isOwnProfile = !paramUserId || paramUserId === me?._id?.toString();
  const targetUserId = isOwnProfile ? me?._id : paramUserId;

  const [profileUser, setProfileUser] = useState(isOwnProfile ? me : null);
  const [tab,         setTab]         = useState('received');
  const [received,    setReceived]    = useState([]);
  const [given,       setGiven]       = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [ratingInfo,  setRatingInfo]  = useState(null);

  const [loadingProfile,  setLoadingProfile]  = useState(!isOwnProfile);
  const [loadingReviews,  setLoadingReviews]  = useState(true);
  const [loadingAnalytics,setLoadingAnalytics]= useState(false);

  const [showMsgModal, setShowMsgModal] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!targetUserId) return;
    setLoadingReviews(true);

    try {
      const [receivedRes, givenRes, ratingRes] = await Promise.all([
        getUserReviews(targetUserId, 'date', 'desc', 'received'),
        getUserReviews(targetUserId, 'date', 'desc', 'given'),
        getUserRatings(targetUserId),
      ]);
      setReceived((receivedRes.data?.reviews || []).map(mapReview));
      setGiven((givenRes.data?.reviews    || []).map(mapReview));
      setRatingInfo(ratingRes.data || null);
    } catch { /* show empty */ }
    finally { setLoadingReviews(false); }

    // Fetch profile data for other users
    if (!isOwnProfile) {
      setLoadingProfile(true);
      try {
        const res = await getUserProfile(targetUserId);
        if (res.data?.user) setProfileUser(res.data.user);
      } catch {}
      finally { setLoadingProfile(false); }
    }

    // Driver analytics — only for drivers, on own profile
    if ((isOwnProfile && isDriver) || (!isOwnProfile && profileUser?.role === 'Driver')) {
      setLoadingAnalytics(true);
      try {
        const res = await getDriverAnalytics(targetUserId);
        setAnalytics(res.data || null);
      } catch {}
      finally { setLoadingAnalytics(false); }
    }
  }, [targetUserId, isOwnProfile, isDriver, profileUser?.role]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  // ── Derived display values ────────────────────────────────────────────────
  const displayUser   = isOwnProfile ? me : profileUser;
  const displayRating = ratingInfo?.averageRating ?? displayUser?.averageRating ?? 0;
  const totalReviews  = ratingInfo?.totalReviews  ?? received.length;
  const aiSummary     = ratingInfo?.reviewSummary || displayUser?.reviewSummary || null;
  const displayRole   = displayUser?.role || 'Passenger';
  const targetIsDriver= displayRole === 'Driver';

  if (loadingProfile) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!displayUser) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.emptyText}>User not found.</Text>
      </SafeAreaView>
    );
  }

  const firstName = displayUser.firstName || '';
  const lastName  = displayUser.lastName  || '';
  const initials  = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';

  const displayReviews = tab === 'received' ? received : given;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Nav bar */}
      <View style={s.navBar}>
        {!isOwnProfile
          ? <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          : <View style={{ width: 40 }} />
        }
        <Text style={s.navTitle}>{isOwnProfile ? 'My Profile' : `${firstName}'s Profile`}</Text>
        {isOwnProfile
          ? <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')} style={s.backBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          : <View style={{ width: 40 }} />
        }
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ── */}
        <View style={s.heroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
            {targetIsDriver && (
              <View style={s.driverBadge}>
                <Ionicons name="car" size={10} color="#fff" />
              </View>
            )}
          </View>
          <Text style={s.name}>{firstName} {lastName}</Text>
          <Text style={s.roleLabel}>{displayRole}</Text>

          {displayUser.email && (
            <Text style={s.email}>{displayUser.email}</Text>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statNum}>{displayUser.totalCompletedRides || 0}</Text>
              <Text style={s.statLabel}>Rides</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={s.statNum}>{displayRating.toFixed(1)}</Text>
                <Ionicons name="star" size={13} color={Colors.accent} />
              </View>
              <Text style={s.statLabel}>Rating</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statNum}>{displayUser.cancellationCount || 0}</Text>
              <Text style={s.statLabel}>Cancellations</Text>
            </View>
          </View>
        </View>

        {/* ── AI Summary ── */}
        {aiSummary ? (
          <View style={s.card}>
            <View style={s.cardH}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={s.cardTitle}>AI Review Summary</Text>
            </View>
            <Text style={s.summaryText}>{aiSummary}</Text>
            <Text style={s.summaryMeta}>Based on {totalReviews} reviews</Text>
          </View>
        ) : totalReviews > 0 && totalReviews < 5 ? (
          <View style={[s.card, { alignItems: 'center' }]}>
            <Text style={s.emptySub}>
              {5 - totalReviews} more review{5 - totalReviews !== 1 ? 's' : ''} needed for an AI summary
            </Text>
          </View>
        ) : null}

        {/* ── Travel preferences ── */}
        {(displayUser.smokingPreference || displayUser.drivingStyle) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Travel Preferences</Text>
            <View style={s.prefRow}>
              {displayUser.smokingPreference && (
                <View style={s.prefChip}>
                  <Ionicons
                    name={displayUser.smokingPreference === 'Non-smoker' ? 'ban' : 'flame'}
                    size={13}
                    color={Colors.textSecondary}
                  />
                  <Text style={s.prefText}>{displayUser.smokingPreference}</Text>
                </View>
              )}
              {displayUser.drivingStyle && (
                <View style={s.prefChip}>
                  <Ionicons name="speedometer-outline" size={13} color={Colors.textSecondary} />
                  <Text style={s.prefText}>{displayUser.drivingStyle} driver</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Driver Route Analytics (driver only) ── */}
        {targetIsDriver && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Top Routes</Text>
            {loadingAnalytics ? (
              <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: 12 }} />
            ) : analytics?.routes?.length > 0 ? (
              <>
                {analytics.routes.map((r, i) => (
                  <View key={i} style={s.routeRow}>
                    <View style={s.routeLeft}>
                      <Text style={s.routeFrom} numberOfLines={1}>
                        {r.from?.split(',')[0]} → {r.to?.split(',')[0]}
                      </Text>
                      <Text style={s.routeMeta}>{r.count} ride{r.count !== 1 ? 's' : ''} · avg {r.avgPrice} MAD</Text>
                    </View>
                    <View style={s.routeBadge}>
                      <Text style={s.routeBadgeText}>#{i + 1}</Text>
                    </View>
                  </View>
                ))}
                {analytics.totalEarned > 0 && (
                  <View style={s.earningsBanner}>
                    <Ionicons name="cash-outline" size={14} color={Colors.primary} />
                    <Text style={s.earningsText}>
                      {analytics.totalPassengers} passengers · {analytics.totalEarned} MAD earned
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={s.emptySub}>No completed rides yet.</Text>
            )}
          </View>
        )}

        {/* ── Reviews tabs ── */}
        <View style={s.card}>
          <View style={s.tabRow}>
            {['received', 'given'].map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tab, tab === t && s.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t === 'received' ? `Received (${received.length})` : `Given (${given.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingReviews ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : displayReviews.length > 0 ? (
            displayReviews.map(r => <ReviewCard key={r._id} review={r} />)
          ) : (
            <Text style={[s.emptySub, { textAlign: 'center', paddingVertical: 20 }]}>
              {tab === 'received' ? 'No reviews yet.' : 'No reviews written yet.'}
            </Text>
          )}
        </View>

        {/* ── Actions ── */}
        {isOwnProfile ? (
          <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('AccountSettings')}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={s.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.msgBtn} onPress={() => setShowMsgModal(true)}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={s.msgBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.reportBtn}
              onPress={() => Alert.alert('Report User', 'Report functionality coming soon.')}
            >
              <Ionicons name="flag-outline" size={16} color={Colors.error} />
              <Text style={s.reportBtnText}>Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwnProfile && (
          <TouchableOpacity style={s.logoutBtn} onPress={() => {
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: async () => {
                await logout();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }},
            ]);
          }}>
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Message modal */}
      <MessageModal
        visible={showMsgModal}
        onClose={() => setShowMsgModal(false)}
        recipientId={targetUserId}
        recipientName={`${firstName} ${lastName}`.trim()}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll:  { paddingBottom: 24 },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },

  heroCard: {
    backgroundColor: Colors.surface, alignItems: 'center',
    paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  driverBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  name:       { fontSize: Typography.xl, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  roleLabel:  { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginTop: 2 },
  email:      { fontSize: Typography.xs, color: Colors.textDisabled, marginTop: 2, marginBottom: Spacing.sm },
  statsRow:   { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: Spacing.md },
  stat:       { alignItems: 'center', minWidth: 60 },
  statNum:    { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  statLabel:  { fontSize: 10, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  statDivider:{ width: 1, height: 32, backgroundColor: Colors.border },

  card: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md,
    marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md,
    ...Shadows.sm,
  },
  cardH: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },

  summaryText: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  summaryMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 6, fontFamily: 'PlusJakartaSans_400Regular' },

  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  prefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.background, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  prefText: { fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  routeLeft:  { flex: 1 },
  routeFrom:  { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  routeMeta:  { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
  routeBadge: {
    backgroundColor: Colors.primaryBg, borderRadius: 12,
    paddingVertical: 3, paddingHorizontal: 8, marginLeft: Spacing.sm,
  },
  routeBadgeText: { fontSize: Typography.xs, color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
  earningsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm, backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md, padding: Spacing.sm,
  },
  earningsText: { fontSize: Typography.xs, color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },

  reviewCard: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  reviewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  reviewAuthor: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary, marginBottom: 2 },
  reviewDate:   { fontSize: 11, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },
  reviewRoute:  { fontSize: 10, color: Colors.textDisabled, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 },
  reviewText:   { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },

  emptySub: { fontSize: Typography.sm, color: Colors.textDisabled, fontFamily: 'PlusJakartaSans_400Regular' },
  emptyText: { fontSize: Typography.md, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' },

  editBtn: {
    margin: Spacing.md, marginTop: Spacing.lg,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  editBtnText: { color: '#fff', fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold' },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, margin: Spacing.md, marginTop: Spacing.lg },
  msgBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 13, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary,
  },
  msgBtnText:    { color: Colors.primary, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },
  reportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 13, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  reportBtnText: { color: Colors.error, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },

  logoutBtn: {
    margin: Spacing.md, marginTop: Spacing.sm,
    padding: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  logoutText: { color: Colors.error, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold' },

  modalOv: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '100%',
  },
  modalH: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  msgInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: Typography.sm, color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular', textAlignVertical: 'top',
    minHeight: 90, backgroundColor: Colors.background, marginBottom: Spacing.md,
  },
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: 13, alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold' },
});
