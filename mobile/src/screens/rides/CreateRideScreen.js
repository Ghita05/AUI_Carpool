import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { selectVehicle } from '../../services/vehicleService';
import { postRideOffer } from '../../services/rideService';
import DateTimePickerModal from '../../components/DateTimePickerModal';

// ── Input formatters ──────────────────────────────────────────────────────
// User types only digits. Formatter auto-inserts '-' / ':' and clamps each
// segment. maxLength is intentionally NOT set on the TextInput — the slice(0,N)
// inside the formatter is the ceiling. Setting maxLength on a formatted string
// (which contains separator characters) causes iOS to block digit entry before
// the value is actually complete.
function formatDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  const mm = Math.min(parseInt(digits.slice(4, 6) || '0', 10), 12);
  let out = digits.slice(0, 4) + '-' + String(mm).padStart(2, '0');
  if (digits.length > 6) {
    const dd = Math.min(parseInt(digits.slice(6, 8) || '0', 10), 31);
    out += '-' + String(dd).padStart(2, '0');
  }
  return out;
}

// Smart date input handler - allows free typing but enforces constraints
function handleSmartDateInput(input, setDate) {
  // Strip non-digits and limit to 8
  let digits = input.replace(/\D/g, '').slice(0, 8);
  
  // If user is typing year only, show raw digits (no hyphen yet)
  if (digits.length <= 4) {
    setDate(digits);
    return;
  }
  
  // 5-6 digits: show YYYY-MM but don't clamp yet (allow deletion)
  if (digits.length <= 6) {
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    setDate(yyyy + '-' + mm);
    return;
  }
  
  // 7+ digits: now enforce constraints
  const yyyy = digits.slice(0, 4);
  const mm = digits.slice(4, 6);
  const dd = digits.slice(6, 8);
  
  // Clamp month to 01-12 (only when they have all month digits)
  const mmClamped = Math.min(Math.max(parseInt(mm, 10) || 1, 1), 12);
  const monthStr = String(mmClamped).padStart(2, '0');
  
  // Clamp day to 01-31 (only when they have all day digits)
  const ddClamped = Math.min(Math.max(parseInt(dd, 10) || 1, 1), 31);
  const dayStr = String(ddClamped).padStart(2, '0');
  
  setDate(yyyy + '-' + monthStr + '-' + dayStr);
}
function formatTime(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  const hh = Math.min(parseInt(digits.slice(0, 2), 10), 23);
  const mm = Math.min(parseInt(digits.slice(2, 4), 10), 59);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

// Smart time input handler - allows free typing but enforces constraints
function handleSmartTimeInput(input, setTime) {
  // Strip non-digits and limit to 4
  let digits = input.replace(/\D/g, '').slice(0, 4);
  
  // If user is typing, show raw digits (no colon yet)
  if (digits.length <= 2) {
    setTime(digits);
    return;
  }
  
  // Once they have 3+ digits, start enforcing constraints
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  
  // Clamp hours to 0-23
  const hhClamped = Math.min(parseInt(hh, 10), 23);
  const hourStr = String(hhClamped).padStart(2, '0');
  
  // If they haven't finished typing minutes yet, show with colon but unclamped minutes
  if (digits.length < 4) {
    setTime(hourStr + ':' + mm);
    return;
  }
  
  // They've typed 4 digits - clamp minutes to 0-59
  const mmClamped = Math.min(parseInt(mm, 10), 59);
  const minStr = String(mmClamped).padStart(2, '0');
  setTime(hourStr + ':' + minStr);
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
}

function PillGroup({ options, selected, onSelect }) {
  return (
    <View style={styles.pillRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.pill, selected === opt && styles.pillActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.pillText, selected === opt && styles.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ToggleRow({ label, sublabel, value, onToggle }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sublabel && <Text style={styles.toggleSub}>{sublabel}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={onToggle}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );
}

export default function CreateRideScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [departure, setDeparture] = useState('AUI Main Gate');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState([]);
  const [addingStop, setAddingStop] = useState(false);
  const [newStop, setNewStop] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('50');
  const [vehicle, setVehicle] = useState(null);
  const [womenOnly, setWomenOnly] = useState(false);
  const [noSmoking, setNoSmoking] = useState(true);
  const [drivStyle, setDrivStyle] = useState('Calm');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    selectVehicle().then(res => {
      const v = res.data?.vehicles || [];
      setVehicles(v);
      if (v.length > 0) setVehicle(v[0]);
    }).catch(() => {});
  }, []);

  const vehicleLabel = vehicle
    ? `${vehicle.brand} ${vehicle.model} (${vehicle.color})`
    : 'No vehicle — add one in settings';

  const handleSwap = () => {
    const tmp = departure;
    setDeparture(destination);
    setDestination(tmp);
  };

  const handleConfirmStop = () => {
    const trimmed = newStop.trim();
    if (!trimmed) return;
    setStops(prev => [...prev, trimmed]);
    setNewStop('');
    setAddingStop(false);
  };

  const handleRemoveStop = (index) => {
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!destination.trim()) { Alert.alert('Missing info', 'Please enter a destination.'); return; }
    if (!vehicle) { Alert.alert('No vehicle', 'Please add a vehicle in your settings first.'); return; }
    if (!departureDateTime) { Alert.alert('Missing info', 'Please select a departure date and time.'); return; }

    setPublishing(true);
    try {
      await postRideOffer({
        vehicleId: vehicle._id,
        departureLocation: departure.trim(),
        destination: destination.trim(),
        stops,
        departureDateTime,
        totalSeats: seats,
        pricePerSeat: parseInt(price) || 50,
        genderPreference: womenOnly ? 'Women-Only' : 'All',
      });
      Alert.alert('Ride Published!', 'Your ride is now visible to passengers.', [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Home' }) },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to publish ride.';
      const status = err.response?.status ? ` (${err.response.status})` : '';
      Alert.alert('Error' + status, msg);
    } finally { setPublishing(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Route */}
        <SectionCard>
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <TextInput
              style={styles.routeInput}
              value={departure}
              onChangeText={setDeparture}
              placeholder="Departure location"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
            <Ionicons name="swap-vertical" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.error} />
            <TextInput
              style={styles.routeInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          {stops.length > 0 && (
            <View style={styles.stopsContainer}>
              {stops.map((stop, i) => (
                <View key={i} style={styles.stopChip}>
                  <Ionicons name="ellipse" size={6} color={Colors.textSecondary} />
                  <Text style={styles.stopChipText}>{stop}</Text>
                  <TouchableOpacity onPress={() => handleRemoveStop(i)} style={styles.stopRemove}>
                    <Ionicons name="close" size={13} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {addingStop ? (
            <View style={styles.stopEntryRow}>
              <Ionicons name="navigate-outline" size={13} color={Colors.textSecondary} />
              <TextInput
                style={styles.stopEntryInput}
                value={newStop}
                onChangeText={setNewStop}
                placeholder="e.g. Ifrane Marché"
                placeholderTextColor={Colors.textDisabled}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirmStop}
              />
              <TouchableOpacity onPress={handleConfirmStop} style={styles.stopConfirmBtn}>
                <Text style={styles.stopConfirmText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingStop(false); setNewStop(''); }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addStopBtn} onPress={() => setAddingStop(true)}>
              <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.addStopText}>Add a stop</Text>
            </TouchableOpacity>
          )}
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

        {/* Seats & Price */}
        <SectionCard title="Seats & Price">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Available Seats</Text>
              <View style={styles.stepperRowInline}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => seats > 1 && setSeats(s => s - 1)}
                >
                  <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{seats}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(s => s + 1)}>
                  <Ionicons name="add" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Price per Seat (MAD)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Vehicle</Text>
          <TouchableOpacity style={styles.vehicleSelector}>
            <Ionicons name="car-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.vehicleSelectorText}>{vehicleLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </SectionCard>

        {/* Preferences */}
        <SectionCard title="Preferences">
          <ToggleRow label="Women Only" sublabel="Restrict to women passengers" value={womenOnly} onToggle={() => setWomenOnly(v => !v)} />
          <View style={styles.prefDivider} />
          <ToggleRow label="No Smoking" sublabel="Smoking not allowed" value={noSmoking} onToggle={() => setNoSmoking(v => !v)} />
          <View style={styles.prefDivider} />
          <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>Driving Style</Text>
          <PillGroup options={['Calm', 'Moderate', 'Fast']} selected={drivStyle} onSelect={setDrivStyle} />
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

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={publishing}
        >
          <Ionicons name="send-outline" size={16} color={Colors.textWhite} />
          <Text style={styles.publishBtnText}>{publishing ? 'Publishing...' : 'Publish Ride'}</Text>
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
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  routeFieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, height: 48, backgroundColor: Colors.background,
  },
  routeInput: { flex: 1, fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  swapBtn: {
    alignSelf: 'center', width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xs,
  },
  stopsContainer: { marginTop: Spacing.sm, gap: Spacing.xs },
  stopChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  stopChipText: { flex: 1, fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  stopRemove: { padding: 2 },
  stopEntryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.sm, height: 44,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, backgroundColor: Colors.primaryBg,
  },
  stopEntryInput: {
    flex: 1, fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  stopConfirmBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primary, borderRadius: 6,
  },
  stopConfirmText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  addStopText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
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
  stepperRowInline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepVal: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  input: {
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  vehicleSelector: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  vehicleSelectorText: { flex: 1, fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  toggleLabel: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  toggleSub: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.border,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  toggleThumbOn: { alignSelf: 'flex-end' },
  prefDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  pillRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  pill: {
    paddingHorizontal: 14, height: 34, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  pillText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary },
  pillTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  publishBtnText: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
  dateTimePickerButton: {
    flexDirection: 'row', alignItems: 'center',
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  dateTimePickerText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
});
