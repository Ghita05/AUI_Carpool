import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { postRideRequest } from '../../services/rideService';
import DateTimePickerModal from '../../components/DateTimePickerModal';

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
}

export default function PostRideRequestScreen({ navigation }) {
  const [from, setFrom] = useState('AUI Campus');
  const [to, setTo] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!from.trim()) { Alert.alert('Missing info', 'Please enter a departure location.'); return; }
    if (!to.trim())   { Alert.alert('Missing info', 'Please enter a destination.'); return; }
    if (!departureDateTime) { Alert.alert('Missing info', 'Please select a date and time.'); return; }
    if (!maxPrice)    { Alert.alert('Missing info', 'Please enter a max budget.'); return; }

    setPosting(true);
    try {
      await postRideRequest({
        departureLocation: from.trim(),
        destination: to.trim(),
        travelDateTime: departureDateTime.toISOString(),
        passengerCount: passengers,
        maxPrice: parseInt(maxPrice) || 100,
        notes,
      });
      Alert.alert('Request Posted!', 'Drivers will be notified of your request.', [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Home' }) },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to post request.';
      Alert.alert('Error', msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Ride Request</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.bannerText}>
            No rides matching your route? Post a request and let drivers find you.
          </Text>
        </View>

        {/* Route */}
        <SectionCard>
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <TextInput
              style={styles.routeInput}
              value={from}
              onChangeText={setFrom}
              placeholder="Departure location"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>
          <View style={{ height: Spacing.sm }} />
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.error} />
            <TextInput
              style={styles.routeInput}
              value={to}
              onChangeText={setTo}
              placeholder="Destination"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Date & Time">
          <TouchableOpacity style={styles.dateTimePickerButton} onPress={() => setShowDateTimePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{marginRight: 8}}/>
            <View style={{flex: 1}}>
              <Text style={styles.dateTimePickerText}>
                {departureDateTime 
                  ? `${new Date(departureDateTime).toLocaleDateString()} ${new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
                  : 'Select Date & Time'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/>
          </TouchableOpacity>
        </SectionCard>

        {/* Passengers & Budget */}
        <SectionCard title="Group & Budget">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Passengers</Text>
              <View style={styles.stepperRowInline}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => passengers > 1 && setPassengers(p => p - 1)}
                >
                  <Ionicons name="remove" size={14} color={passengers <= 1 ? Colors.textDisabled : Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{passengers}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setPassengers(p => p + 1)}>
                  <Ionicons name="add" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Max Budget (MAD)</Text>
              <TextInput
                style={styles.input}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder="e.g. 80"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
          </View>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Additional Notes">
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any preferences or extra info for drivers..."
            placeholderTextColor={Colors.textDisabled}
            multiline
            numberOfLines={4}
          />
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      <DateTimePickerModal
        visible={showDateTimePicker}
        date={departureDateTime}
        time={departureDateTime ? new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '09:00'}
        onClose={() => setShowDateTimePicker(false)}
        onConfirm={(selectedDateTime) => {
          setDepartureDateTime(selectedDateTime);
          setShowDateTimePicker(false);
        }}
      />

      {/* Post Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
          <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post Request'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    margin: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary,
  },
  bannerText: {
    flex: 1, fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.primary, lineHeight: 18,
  },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: {
    fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  routeFieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, height: 48, backgroundColor: Colors.background,
  },
  routeInput: {
    flex: 1, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  fieldInputText: {
    flex: 1, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  stepperRowInline: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, height: 46,
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepVal: {
    fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary,
  },
  input: {
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  notesInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
    minHeight: 100, textAlignVertical: 'top',
  },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm,
  },
  postBtn: {
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtnText: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: {
    fontSize: Typography.base, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary,
  },
  dateTimePickerButton: {
    flexDirection: 'row', alignItems: 'center',
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  dateTimePickerText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
});
