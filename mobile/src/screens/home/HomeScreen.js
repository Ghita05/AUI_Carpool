import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, TextInput, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const { width, height } = Dimensions.get('window');

const RIDES = [
  { id: 1, dest: 'Fez', price: 50, time: '14:00 today', driver: 'Ghita N.', rating: 4.8, seats: 4, taken: 2, color: Colors.primary },
  { id: 2, dest: 'Rabat', price: 100, time: '17:30 today', driver: 'Ahmed B.', rating: 5.5, seats: 4, taken: 3, color: '#F59E0B' },
  { id: 3, dest: 'Meknes', price: 40, time: '15:30 today', driver: 'Kenza N.', rating: 8.5, seats: 4, taken: 4, color: Colors.textSecondary },
];

function SeatsRow({ total, taken }) {
  return (
    <View style={styles.seatsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < taken ? 'person' : 'person-outline'}
          size={14}
          color={i < taken ? Colors.primary : Colors.border}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

function RideCard({ ride }) {
  return (
    <View style={styles.rideCard}>
      <View style={styles.rideCardRow}>
        <View style={[styles.destDot, { backgroundColor: ride.color }]} />
        <Text style={styles.rideDestText}>{ride.dest}</Text>
        <Text style={styles.ridePriceText}>{ride.price} MAD</Text>
      </View>
      <View style={styles.rideMetaRow}>
        <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
        <Text style={styles.rideMetaText}>{ride.time}</Text>
      </View>
      <View style={styles.rideDriverRow}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{ride.driver[0]}</Text>
        </View>
        <Text style={styles.driverName}>{ride.driver}</Text>
        <Ionicons name="star" size={11} color="#F59E0B" style={{ marginLeft: 'auto' }} />
        <Text style={styles.ratingText}>{ride.rating}</Text>
      </View>
      <SeatsRow total={ride.seats} taken={ride.taken} />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [searchText, setSearchText] = useState('');

  const NAV_ITEMS = [
    { name: 'Home', icon: 'map', activeIcon: 'map' },
    { name: 'Rides', icon: 'car-outline', activeIcon: 'car' },
    { name: 'Post', icon: 'add-circle-outline', activeIcon: 'add-circle' },
    { name: 'Inbox', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
    { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* MAP AREA */}
      <View style={styles.mapArea}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.mapPlaceholderText}>AUI Campus Map</Text>
          <Text style={styles.mapPlaceholderSub}>Google Maps integration</Text>
        </View>

        {/* MAP PINS */}
        <View style={[styles.mapPin, styles.pinGreen, { top: '30%', left: '20%' }]}>
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.pinLabel}>Fez · 3 seats</Text>
        </View>
        <View style={[styles.mapPin, styles.pinAmber, { top: '45%', right: '25%' }]}>
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.pinLabel}>Rabat · 1 seat</Text>
        </View>
        <View style={[styles.mapPin, styles.pinGrey, { bottom: '30%', left: '40%' }]}>
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.pinLabel}>Meknes · Full</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="options-outline" size={18} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.textDisabled}
            value={searchText}
            onChangeText={setSearchText}
          />
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        </View>
      </View>

      {/* BOTTOM SHEET */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Ride near your route</Text>
          <View style={styles.communityBadge}>
            <Ionicons name="trophy-outline" size={12} color={Colors.primary} />
            <Text style={styles.communityText}>Community</Text>
          </View>
        </View>
        <Text style={styles.sheetSub}>4 rides available today</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
          {RIDES.map(r => <RideCard key={r.id} ride={r} />)}
        </ScrollView>
      </View>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.name;
          const isPost = item.name === 'Post';
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isPost && styles.navItemPost]}
              onPress={() => setActiveTab(item.name)}
            >
              {isPost ? (
                <View style={styles.postButton}>
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
              ) : (
                <>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22}
                    color={isActive ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.name}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Map
  mapArea: { flex: 1, position: 'relative', backgroundColor: '#3a7d44' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2d6e38' },
  mapPlaceholderText: { color: 'rgba(255,255,255,0.5)', fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  mapPlaceholderSub: { color: 'rgba(255,255,255,0.3)', fontSize: Typography.sm, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Pins
  mapPin: { position: 'absolute', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, ...Shadows.sm },
  pinGreen: { backgroundColor: Colors.primary },
  pinAmber: { backgroundColor: '#F59E0B' },
  pinGrey: { backgroundColor: Colors.textSecondary },
  pinLabel: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold', marginLeft: 3 },

  // Search
  searchBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 12 : 16, left: Spacing.lg, right: Spacing.lg,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10, ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: Typography.base, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },

  // Bottom Sheet
  bottomSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: 8, ...Shadows.card },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sheetTitle: { fontSize: Typography.base, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  communityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  communityText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  sheetSub: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginBottom: Spacing.md },
  cardsScroll: { paddingRight: Spacing.lg, paddingBottom: Spacing.sm },

  // Ride Card
  rideCard: { width: 160, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  rideCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  destDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  rideDestText: { fontSize: Typography.base, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, flex: 1 },
  ridePriceText: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  rideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  rideMetaText: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  rideDriverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  driverAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  driverAvatarText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.primary },
  driverName: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  ratingText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginLeft: 2 },
  seatsRow: { flexDirection: 'row', alignItems: 'center' },

  // Bottom Nav
  bottomNav: { flexDirection: 'row', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  navItemPost: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  navLabelActive: { color: Colors.primary, fontFamily: 'Inter_600SemiBold' },
  postButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -20, ...Shadows.card },
});
