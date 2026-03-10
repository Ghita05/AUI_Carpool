import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const PROFILE = {
  name: 'Ghita Nafa', initials: 'GN', email: 'g.nafa@aui.ma',
  rating: 4.8, rides: 23, cancellations: 1, memberSince: 'Sept 2023',
  smoking: 'Non-smoker', drivingStyle: 'Calm driver', role: 'Both',
};

const REVIEWS_RECEIVED = [
  {
    id: '1', author: 'Ahmed B.', authorInitials: 'AB', rating: 5,
    date: 'Feb 21, 2026', rideTag: 'AUI → Fez',
    text: 'Excellent driver! Very punctual and smooth ride. Would definitely book again.',
  },
  {
    id: '2', author: 'Kenza N.', authorInitials: 'KN', rating: 4,
    date: 'Feb 10, 2026', rideTag: 'AUI → Meknes',
    text: 'Great trip! Comfortable car and good conversation. Slightly late departure.',
  },
];

const REVIEWS_GIVEN = [
  {
    id: '3', author: 'Omar S.', authorInitials: 'OS', rating: 5,
    date: 'Jan 28, 2026', rideTag: 'Casa → AUI',
    text: 'Very reliable passenger, confirmed on time and great company.',
  },
];

function StarRow({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
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

function ReviewCard({ review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{review.authorInitials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <View style={styles.reviewNameRow}>
            <Text style={styles.reviewAuthor}>{review.author}</Text>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
          <StarRow rating={review.rating} size={12} />
        </View>
      </View>
      <View style={styles.rideTag}>
        <Ionicons name="location-outline" size={10} color={Colors.primary} />
        <Text style={styles.rideTagText}>{review.rideTag}</Text>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
    </View>
  );
}

export default function UserProfileScreen({ navigation, route }) {
  const isOwnProfile = route?.params?.isOwnProfile !== false;
  const [activeTab, setActiveTab] = useState('received');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwnProfile ? 'My Profile' : 'Profile'}</Text>
        {isOwnProfile ? (
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('AccountSettings')}>
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + Name */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{PROFILE.initials}</Text>
            </View>
            {isOwnProfile && (
              <TouchableOpacity style={styles.cameraBadge}>
                <Ionicons name="camera" size={12} color={Colors.textWhite} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>{PROFILE.name}</Text>
          <View style={styles.emailRow}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.emailText}>{PROFILE.email}</Text>
          </View>
          <Text style={styles.memberSince}>Member since {PROFILE.memberSince}</Text>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {[
            { val: PROFILE.rides,         label: 'Rides',         color: Colors.textPrimary },
            { val: PROFILE.rating,        label: 'Rating',        color: Colors.textPrimary, star: true },
            { val: PROFILE.cancellations, label: 'Cancellations', color: Colors.error },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statDivider]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                {s.star && <Ionicons name="star" size={14} color={Colors.accent} />}
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.prefRow}>
            <Ionicons name="ban-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.prefText}>{PROFILE.smoking}</Text>
            {isOwnProfile && (
              <TouchableOpacity style={styles.editIconBtn}>
                <Ionicons name="pencil-outline" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.prefRow}>
            <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.prefText}>{PROFILE.drivingStyle}</Text>
            {isOwnProfile && (
              <TouchableOpacity style={styles.editIconBtn}>
                <Ionicons name="pencil-outline" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Actions for other's profile */}
        {!isOwnProfile && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textWhite} />
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline}>
              <Ionicons name="flag-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.reviewTabs}>
            {['received', 'given'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.reviewTab, activeTab === t && styles.reviewTabActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.reviewTabText, activeTab === t && styles.reviewTabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'received' ? REVIEWS_RECEIVED.length : REVIEWS_GIVEN.length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {(activeTab === 'received' ? REVIEWS_RECEIVED : REVIEWS_GIVEN).map(r => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar - own profile only */}
      {isOwnProfile && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('AccountSettings')}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.textWhite} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  heroSection: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surface },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary,
  },
  avatarText: { fontSize: Typography['4xl'], fontFamily: 'Inter_700Bold', color: Colors.primary },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  profileName: { fontSize: Typography['3xl'], fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginBottom: 4 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  emailText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  memberSince: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginVertical: Spacing.sm, paddingVertical: Spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { borderRightWidth: 1, borderRightColor: Colors.border },
  statVal: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
  },
  sectionTitle: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  prefText: { flex: 1, fontSize: Typography.base, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  editIconBtn: { padding: Spacing.xs },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, backgroundColor: Colors.primary, borderRadius: Radius.sm,
  },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.error,
  },
  actionBtnText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.textWhite },
  reviewTabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  reviewTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.background },
  reviewTabActive: { backgroundColor: Colors.primaryBg },
  reviewTabText: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  reviewTabTextActive: { color: Colors.primary },
  reviewCard: { marginBottom: Spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: Typography.sm, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  reviewNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  reviewAuthor: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  reviewDate: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  rideTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, alignSelf: 'flex-start', marginBottom: Spacing.xs,
  },
  rideTagText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  reviewText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  editProfileBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
