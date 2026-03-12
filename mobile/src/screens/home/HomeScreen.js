import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  Dimensions, StatusBar, TextInput, Platform, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

function RideCard({ ride, onPress }) {
  return (
    <TouchableOpacity style={styles.rideCard} onPress={onPress} activeOpacity={0.7}>
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
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);

  // Ride locations with coordinates (kept for reference)
  const RIDE_LOCATIONS = [
    { id: 1, dest: 'Fez', price: 50, time: '14:00 today', driver: 'Ghita N.', rating: 4.8, seats: 4, taken: 2, color: Colors.primary, latitude: 33.632, longitude: -5.985 },
    { id: 2, dest: 'Rabat', price: 100, time: '17:30 today', driver: 'Ahmed B.', rating: 5.5, seats: 4, taken: 3, color: '#F59E0B', latitude: 33.635, longitude: -5.992 },
    { id: 3, dest: 'Meknes', price: 40, time: '15:30 today', driver: 'Kenza N.', rating: 8.5, seats: 4, taken: 4, color: Colors.textSecondary, latitude: 33.628, longitude: -5.980 },
  ];

  const handleRidePress = (ride) => {
    setSelectedRide(ride);
  };

  const handleBookNow = () => {
    if (selectedRide) {
      navigation.navigate('BookRide', { rideId: selectedRide.id });
      setSelectedRide(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* INTERACTIVE MAP AREA */}
      <View style={styles.mapArea}>
        {/* Map Background - Using linear gradient with campus color */}
        <View style={styles.mapBackground}>
          <Ionicons name="map-outline" size={120} color="rgba(255,255,255,0.15)" style={{ marginTop: 80 }} />
          <Text style={styles.mapLabel}>AUI Ifrane Campus</Text>
          <Text style={styles.mapCoords}>33.6330°N, 5.9898°W</Text>
        </View>

        {/* Interactive Ride Location Pins */}
        <TouchableOpacity
          style={[styles.ridePin, { top: '35%', left: '25%', borderColor: Colors.primary }]}
          onPress={() => handleRidePress(RIDE_LOCATIONS[0])}
          activeOpacity={0.7}
        >
          <View style={[styles.pinDot, { backgroundColor: Colors.primary }]} />
          <View style={styles.pinLabel}>
            <Text style={styles.pinLabelText}>Fez</Text>
            <Text style={styles.pinPrice}>50 MAD</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ridePin, { top: '50%', right: '20%', borderColor: '#F59E0B' }]}
          onPress={() => handleRidePress(RIDE_LOCATIONS[1])}
          activeOpacity={0.7}
        >
          <View style={[styles.pinDot, { backgroundColor: '#F59E0B' }]} />
          <View style={styles.pinLabel}>
            <Text style={styles.pinLabelText}>Rabat</Text>
            <Text style={styles.pinPrice}>100 MAD</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ridePin, { bottom: '25%', left: '40%', borderColor: Colors.textSecondary }]}
          onPress={() => handleRidePress(RIDE_LOCATIONS[2])}
          activeOpacity={0.7}
        >
          <View style={[styles.pinDot, { backgroundColor: Colors.textSecondary }]} />
          <View style={styles.pinLabel}>
            <Text style={styles.pinLabelText}>Meknes</Text>
            <Text style={styles.pinPrice}>40 MAD</Text>
          </View>
        </TouchableOpacity>

        {/* Search Bar Overlay */}
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

      {/* RIDE DETAILS MODAL */}
      <Modal
        visible={!!selectedRide}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRide(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedRide(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Ride Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedRide && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destination</Text>
                  <Text style={styles.detailValue}>{selectedRide.dest}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{selectedRide.price} MAD</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{selectedRide.time}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{selectedRide.driver}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rating</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.detailValue}>{selectedRide.rating}</Text>
                  </View>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Available Seats</Text>
                  <Text style={styles.detailValue}>{selectedRide.seats - selectedRide.taken} of {selectedRide.seats}</Text>
                </View>

                <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* RIDE CARDS BOTTOM SHEET */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHeader}>
          <Text style={styles.bottomSheetTitle}>Available Rides</Text>
          <Text style={styles.bottomSheetCount}>{RIDES.length} rides</Text>
        </View>
        <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
          {RIDES.map(ride => (
            <RideCard 
              key={ride.id} 
              ride={ride} 
              onPress={() => handleRidePress(ride)}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Map Area
  mapArea: { flex: 1, position: 'relative', backgroundColor: '#2d6e38', overflow: 'hidden' },
  mapBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(45, 110, 56, 0.95)' },
  mapLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.base, fontFamily: 'Inter_700Bold', marginTop: 12 },
  mapCoords: { color: 'rgba(255,255,255,0.5)', fontSize: Typography.sm, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Ride Location Pins
  ridePin: { 
    position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 2,
    ...Shadows.card
  },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  pinLabel: { paddingHorizontal: Spacing.xs },
  pinLabelText: { fontSize: Typography.sm, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  pinPrice: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.primary, marginTop: 1 },

  // Search Bar
  searchBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 12 : 16, left: Spacing.lg, right: Spacing.lg,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10, ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: Typography.base, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  modalBody: { paddingBottom: Spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  detailLabel: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  detailValue: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, backgroundColor: Colors.border },
  bookButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  bookButtonText: { color: '#fff', fontSize: Typography.base, fontFamily: 'Inter_700Bold' },

  // Bottom Sheet
  bottomSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, ...Shadows.card, maxHeight: '35%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  bottomSheetTitle: { fontSize: Typography.base, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  bottomSheetCount: { fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  ridesList: { paddingHorizontal: 0 },

  // Ride Card
  rideCard: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
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
});
