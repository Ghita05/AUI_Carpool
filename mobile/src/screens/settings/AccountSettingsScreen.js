import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const SMOKING_OPTIONS = ['Non-smoker', 'Smoker'];
const DRIVING_OPTIONS  = ['Calm', 'Moderate', 'Fast'];
const VEHICLE_SIZES    = ['Small', 'Medium', 'Large'];

function SectionCard({ title, children, action }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function FieldRow({ label, children, half }) {
  return (
    <View style={[styles.fieldRow, half && styles.fieldRowHalf]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PillGroup({ options, selected, onSelect }) {
  return (
    <View style={styles.pillGroup}>
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

function Stepper({ value, onInc, onDec, min = 1 }) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={() => value > min && onDec()}
      >
        <Ionicons name="remove" size={14} color={value <= min ? Colors.textDisabled : Colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.stepperVal}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={onInc}>
        <Ionicons name="add" size={14} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const [firstName,  setFirstName]  = useState('Ghita');
  const [lastName,   setLastName]   = useState('Nafa');
  const [phone,      setPhone]      = useState('+212 612 345 678');
  const [smoking,    setSmoking]    = useState('Non-smoker');
  const [drivStyle,  setDrivStyle]  = useState('Calm');
  // Vehicle (driver-only)
  const isDriver = true;
  const [vBrand,   setVBrand]   = useState('Dacia');
  const [vModel,   setVModel]   = useState('Logan');
  const [vColor,   setVColor]   = useState('White');
  const [vYear,    setVYear]    = useState('2022');
  const [vPlate,   setVPlate]   = useState('12345-AB-67');
  const [vSize,    setVSize]    = useState('Medium');
  const [vLuggage, setVLuggage] = useState(3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>GN</Text>
            </View>
            <TouchableOpacity style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <SectionCard title="Personal Information">
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Verified email */}
          <Text style={styles.fieldLabel}>AUI Email</Text>
          <View style={styles.verifiedEmailBox}>
            <Ionicons name="lock-closed" size={14} color={Colors.primary} />
            <Text style={styles.verifiedEmailText}>g.nafa@aui.ma</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </SectionCard>

        {/* Travel Preferences */}
        <SectionCard title="Travel Preferences">
          <Text style={styles.fieldLabel}>Smoking Preference</Text>
          <PillGroup options={SMOKING_OPTIONS} selected={smoking} onSelect={setSmoking} />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Driving Style</Text>
          <PillGroup options={DRIVING_OPTIONS} selected={drivStyle} onSelect={setDrivStyle} />
        </SectionCard>

        {/* Vehicle (driver only) */}
        {isDriver && (
          <SectionCard
            title="My Vehicle"
            action={
              <TouchableOpacity>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            }
          >
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Brand</Text>
                <TextInput style={styles.input} value={vBrand} onChangeText={setVBrand} />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Model</Text>
                <TextInput style={styles.input} value={vModel} onChangeText={setVModel} />
              </View>
            </View>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Color</Text>
                <TextInput style={styles.input} value={vColor} onChangeText={setVColor} />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Year</Text>
                <TextInput style={styles.input} value={vYear} onChangeText={setVYear} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>License Plate</Text>
            <TextInput
              style={styles.input}
              value={vPlate}
              onChangeText={setVPlate}
              autoCapitalize="characters"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Vehicle Size</Text>
            <PillGroup options={VEHICLE_SIZES} selected={vSize} onSelect={setVSize} />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Luggage Capacity (bags)</Text>
            <Stepper
              value={vLuggage}
              onInc={() => setVLuggage(v => v + 1)}
              onDec={() => setVLuggage(v => v - 1)}
              min={1}
            />
          </SectionCard>
        )}

        {/* Security */}
        <SectionCard title="Security">
          <TouchableOpacity style={styles.securityRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.securityLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.secDivider} />
          <TouchableOpacity style={styles.securityRow}>
            <Ionicons name="person-remove-outline" size={18} color={Colors.error} />
            <Text style={[styles.securityLabel, { color: Colors.error }]}>Deactivate Account</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
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
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surface, marginBottom: Spacing.sm },
  avatarWrap: { position: 'relative', marginBottom: Spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  avatarText: { fontSize: Typography['4xl'], fontFamily: 'Inter_700Bold', color: Colors.primary },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface,
  },
  changePhotoText: { fontSize: Typography.base, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  card: {
    backgroundColor: Colors.surface, marginBottom: Spacing.sm,
    padding: Spacing.lg,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.md, fontFamily: 'Inter_700Bold', color: Colors.textPrimary },
  editLink: { fontSize: Typography.sm, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  twoCol: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  input: {
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  verifiedEmailBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, backgroundColor: Colors.primaryBg, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.primary,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.xs,
  },
  verifiedEmailText: { flex: 1, fontSize: Typography.md, fontFamily: 'Inter_400Regular', color: Colors.textPrimary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedBadgeText: { fontSize: Typography.xs, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    paddingHorizontal: 16, height: 36, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  pillActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  pillText: { fontSize: Typography.base, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  pillTextActive: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepperVal: { fontSize: Typography['2xl'], fontFamily: 'Inter_700Bold', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  securityLabel: { fontSize: Typography.md, fontFamily: 'Inter_500Medium', color: Colors.textPrimary },
  secDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: {
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: Typography.lg, fontFamily: 'Inter_700Bold', color: Colors.textWhite },
});
