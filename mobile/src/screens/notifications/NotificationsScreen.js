import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const NOTIFICATIONS = [
  {
    group: 'Bookings',
    items: [
      { id: '1', title: 'Booking Confirmed', preview: 'Your ride to Fez on Feb 20 is confirmed', time: '5 min ago', type: 'booking_confirmed', unread: true },
      { id: '2', title: 'New Booking', preview: 'Ahmed Benali booked a seat on your Rabat ride', time: '1 hr ago', type: 'booking_new', unread: true },
      { id: '3', title: 'Booking Cancelled', preview: 'Your booking for Meknes was cancelled', time: '2 hrs ago', type: 'booking_cancelled', unread: false },
    ],
  },
  {
    group: 'Rides',
    items: [
      { id: '4', title: 'Departure Reminder', preview: 'Your ride to Fez departs in 1 hour', time: '3 hrs ago', type: 'ride_reminder', unread: true },
      { id: '5', title: 'Ride Completed', preview: 'Your trip to Casablanca is complete. Rate your experience!', time: 'Yesterday', type: 'ride_completed', unread: false },
    ],
  },
  {
    group: 'System',
    items: [
      { id: '6', title: 'Account Verified', preview: 'Your AUI email has been successfully verified', time: 'Feb 15', type: 'system', unread: false },
    ],
  },
];

const ICON_CONFIG = {
  booking_confirmed: { icon: 'checkmark-circle', bg: Colors.primaryBg,     color: Colors.primary },
  booking_new:       { icon: 'person-add',        bg: Colors.primaryBg,     color: Colors.primary },
  booking_cancelled: { icon: 'close-circle',       bg: '#FEF2F2',            color: Colors.error   },
  ride_reminder:     { icon: 'time',               bg: '#FEF3C7',            color: Colors.accent  },
  ride_completed:    { icon: 'flag',               bg: Colors.primaryBg,     color: Colors.primary },
  system:            { icon: 'information-circle', bg: Colors.background,    color: Colors.textSecondary },
};

function NotifItem({ item }) {
  const cfg = ICON_CONFIG[item.type] || ICON_CONFIG.system;
  return (
    <TouchableOpacity
      style={[styles.notifItem, item.unread && styles.notifItemUnread]}
      activeOpacity={0.75}
    >
      {item.unread && <View style={styles.unreadDot} />}
      <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, item.unread && styles.notifTitleBold]}>{item.title}</Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        <Text style={styles.notifPreview} numberOfLines={2}>{item.preview}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const totalUnread = NOTIFICATIONS.flatMap(g => g.items).filter(i => i.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications {totalUnread > 0 ? `(${totalUnread})` : ''}
        </Text>
        <TouchableOpacity style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {NOTIFICATIONS.map(group => (
          <View key={group.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>{group.group.toUpperCase()}</Text>
            </View>
            {group.items.map(item => <NotifItem key={item.id} item={item} />)}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  scroll: { flex: 1 },
  groupHeader: { backgroundColor: Colors.background, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  groupLabel: {
    fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.8,
  },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, position: 'relative',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifItemUnread: {
    borderLeftWidth: 3, borderLeftColor: Colors.primary, backgroundColor: '#FBFFFE',
  },
  unreadDot: {
    position: 'absolute', top: 18, left: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  notifTitle: { fontSize: Typography.base, fontFamily: 'Inter_500Medium', color: Colors.textPrimary, flex: 1 },
  notifTitleBold: { fontFamily: 'Inter_700Bold' },
  notifTime: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginLeft: Spacing.sm },
  notifPreview: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, lineHeight: 18 },
});
