import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const VEHICLES = ['Dacia Logan (White)', 'Renault Clio (Black)'];

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
  const [departure, setDeparture] = useState('AUI Main Gate');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState([]);
  const [date, setDate] = useState('Feb 20, 2026');
  const [time, setTime] = useState('14:00');
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('50');
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [noSmoking, setNoSmoking] = useState(true);
  const [drivStyle, setDrivStyle] = useState('Calm');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Route */}
        <SectionCard>
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.primary} style={styles.pinIcon} />
            <TextInput
              style={styles.routeInput}
              value={departure}
              onChangeText={setDeparture}
              placeholder="Departure location"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          <TouchableOpacity style={styles.swapBtn}>
            <Ionicons name="swap-vertical" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.error} style={styles.pinIcon} />
            <TextInput
              style={styles.routeInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          <TouchableOpacity style={styles.addStopBtn}>
            <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.addStopText}>Add a stop</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Date & Time">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TouchableOpacity style={styles.fieldInput}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.fieldInputText}>{date}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TouchableOpacity style={styles.fieldInput}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.fieldInputText}>{time}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
            <Text style={styles.vehicleSelectorText}>{vehicle}</Text>
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

      {/* Publish Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Ionicons name="send-outline" size={16} color={Colors.textWhite} />
          <Text style={styles.publishBtnText}>Publish Ride</Text>
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
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  routeFieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, height: 48, backgroundColor: Colors.background,
  },
  pinIcon: {},
  routeInput: { flex: 1, fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  swapBtn: {
    alignSelf: 'center', width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xs,
  },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  addStopText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  fieldInputText: { fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  stepperRowInline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepVal: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  input: {
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, fontSize: Typography.md,
    fontFamily: 'Inter_400Regular', color: Colors.textPrimary,
  },
  vehicleSelector: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  vehicleSelectorText: { flex: 1, fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  toggleLabel: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.textPrimary },
  toggleSub: { fontSize: Typography.xs, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
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
  pillText: { fontSize: Typography.base, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  publishBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
