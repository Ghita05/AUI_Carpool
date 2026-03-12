import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

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
  const [date, setDate] = useState('Feb 25, 2026');
  const [time, setTime] = useState('09:00');
  const [passengers, setPassengers] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');

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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.bannerText}>
            No rides matching your route? Post a request and let drivers find you.
          </Text>
        </View>

        {/* Route */}
        <SectionCard>
          <View style={styles.routeField}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <TextInput
              style={styles.routeInput}
              value={from}
              onChangeText={setFrom}
              placeholder="Departure location"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeField}>
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
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TouchableOpacity style={styles.fieldBtn}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.fieldBtnText}>{date}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TouchableOpacity style={styles.fieldBtn}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.fieldBtnText}>{time}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SectionCard>

        {/* Passengers & Budget */}
        <SectionCard title="Group & Budget">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Passengers</Text>
              <View style={styles.stepperRow}>
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

      {/* Post Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Text style={styles.postBtnText}>Post Request</Text>
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
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    margin: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary,
  },
  bannerText: { flex: 1, fontSize: Typography.sm, fontFamily: 'Inter_400Regular', color: Colors.primary, lineHeight: 18 },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  routeField: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    minHeight: 46, paddingHorizontal: Spacing.md,
  },
  routeInput: { flex: 1, fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary, paddingVertical: Spacing.sm },
  routeDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  fieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  fieldBtnText: { fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, height: 46 },
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
  notesInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary,
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
  postBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
});
