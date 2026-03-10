import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export default function BookingConfirmationScreen({ navigation, route }) {
  const { seats = 1, stop = 'AUI Main Gate', luggage = '1 suitcase', total = 50 } = route?.params || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking Confirmed</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Success Hero */}
        <View style={styles.hero}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={36} color={Colors.textWhite} />
          </View>
          <Text style={styles.heroTitle}>You're all set!</Text>
          <Text style={styles.heroSub}>Booking #4001 is confirmed</Text>
        </View>

        {/* Ride Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>RIDE DETAILS</Text>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <Text style={styles.routeText}>AUI Main Gate → Fez Airport</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoGrid}>
            {[
              { icon: 'calendar-outline', val: 'Today, Feb 20', label: 'Date' },
              { icon: 'time-outline', val: '14:00', label: 'Departure' },
              { icon: 'person-outline', val: 'Ghita Nafa', label: 'Driver' },
              { icon: 'car-outline', val: 'Dacia Logan', label: 'Vehicle' },
            ].map((item, i) => (
              <View key={i} style={styles.infoItem}>
                <Ionicons name={item.icon} size={13} color={Colors.textSecondary} />
                <Text style={styles.infoVal}>{item.val}</Text>
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.infoVal}>{stop}</Text>
              <Text style={styles.infoLabel}>Your Stop</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.infoVal}>{luggage}</Text>
              <Text style={styles.infoLabel}>Luggage</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total To Be Paid</Text>
            <Text style={styles.totalVal}>{total} MAD</Text>
          </View>
        </View>

        {/* Driver Card */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>GN</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>Ghita Nafa</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.ratingText}>4.8 · 23 rides</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.msgBtn}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.infoText}>The driver will confirm your spot shortly. You'll get a notification.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => navigation.navigate('MyRides')}
        >
          <Text style={styles.outlineBtnText}>My Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.primaryBtnText}>Back to Map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: Colors.primaryBg, paddingVertical: 32,
    alignItems: 'center', marginBottom: Spacing.md,
  },
  successCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  heroTitle: { fontSize: Typography['3xl'], fontFamily: 'Inter_700Bold', color: Colors.primary, marginBottom: 4 },
  heroSub: { fontSize: Typography.base, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.lg, ...Shadows.card,
  },
  sectionLabel: {
    fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  routeText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  infoItem: { flex: 1, minWidth: '40%', gap: 3 },
  infoVal: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  infoLabel: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: Typography.base, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  totalVal: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold', color: Colors.primary },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.primary },
  driverInfo: { flex: 1, marginLeft: Spacing.sm },
  driverName: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, height: 36, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  msgBtnText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, backgroundColor: '#FFFBEB',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accent,
  },
  infoText: { flex: 1, fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: '#92400E' },
  bottomBar: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg,
    paddingBottom: Spacing.xl, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  outlineBtn: {
    flex: 1, height: 52, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: Typography.md, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  primaryBtn: {
    flex: 1, height: 52, backgroundColor: Colors.primary,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
