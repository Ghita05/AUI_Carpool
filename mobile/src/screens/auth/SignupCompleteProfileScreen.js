import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StepIndicator from '../../components/common/StepIndicator';

export default function SignupCompleteProfileScreen({ navigation, route }) {
  const { setUser } = useAuth();
  const email = route?.params?.email || 'yourname@aui.ma';
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '', phone: '', role: 'Passenger' });
  const [cashwalletUploaded, setCashwalletUploaded] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: null })); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.password || form.password.length < 8) e.password = 'Min. 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!cashwalletUploaded) e.cashwallet = 'Please upload your cashwallet scan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCashwalletUpload = () => {
    // In a real app this would use expo-image-picker
    Alert.alert('Upload CashWallet', 'In the full version, this opens the camera/gallery to upload your cashwallet scan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Simulate Upload', onPress: () => setCashwalletUploaded(true) },
    ]);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setUser({
        firstName: form.firstName, lastName: form.lastName, email,
        role: form.role.toLowerCase(),
        initials: (form.firstName[0] + form.lastName[0]).toUpperCase(),
        rating: 0, rides: 0, isAuthenticated: true,
      });
      setLoading(false);
      navigation.replace('Main');
    }, 1200);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>Almost there!</Text>
        </LinearGradient>

        <View style={styles.card}>
          <StepIndicator currentStep={3} totalSteps={3} />

          {/* Verified email */}
          <View style={styles.emailLocked}>
            <Ionicons name="mail" size={14} color={Colors.primary} />
            <Text style={styles.emailText}>{email}</Text>
            <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={14} color={Colors.primary} /><Text style={styles.verifiedText}>Verified</Text></View>
          </View>

          {/* Name row */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input label="First Name" placeholder="First name" value={form.firstName} onChangeText={t => update('firstName', t)} error={errors.firstName} />
            </View>
            <View style={styles.halfField}>
              <Input label="Last Name" placeholder="Last name" value={form.lastName} onChangeText={t => update('lastName', t)} error={errors.lastName} />
            </View>
          </View>

          <Input label="Password" placeholder="Enter your password" value={form.password} onChangeText={t => update('password', t)} secureTextEntry error={errors.password} />
          <Input label="Confirm Password" placeholder="Confirm your password" value={form.confirmPassword} onChangeText={t => update('confirmPassword', t)} secureTextEntry error={errors.confirmPassword} />
          <Input label="Phone Number" placeholder="Enter your phone number" value={form.phone} onChangeText={t => update('phone', t)} keyboardType="phone-pad" error={errors.phone} />

          {/* CashWallet upload */}
          <Text style={styles.fieldLabel}>CASHWALLET</Text>
          <TouchableOpacity style={[styles.uploadArea, cashwalletUploaded && styles.uploadDone, errors.cashwallet && styles.uploadError]} onPress={handleCashwalletUpload}>
            <Ionicons name={cashwalletUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={cashwalletUploaded ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.uploadText, cashwalletUploaded && { color: Colors.primary }]}>
              {cashwalletUploaded ? 'CashWallet uploaded' : 'Upload a clear picture of your cashwallet'}
            </Text>
          </TouchableOpacity>
          {errors.cashwallet && <Text style={styles.errorText}>{errors.cashwallet}</Text>}
          <Text style={styles.helperText}>The cashwallet scan is used for identity verification purposes</Text>

          {/* Role selector */}
          <Text style={styles.fieldLabel}>I AM A...</Text>
          <View style={styles.roleRow}>
            {[{ label: 'Passenger', icon: 'person-outline' }, { label: 'Driver', icon: 'car-outline' }].map(({ label, icon }) => (
              <TouchableOpacity key={label} style={[styles.rolePill, form.role === label && styles.rolePillActive]} onPress={() => update('role', label)}>
                <Ionicons name={icon} size={16} color={form.role === label ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.rolePillText, form.role === label && styles.rolePillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button label="Create My Account" onPress={handleSubmit} loading={loading} style={{ marginTop: Spacing.lg }} />

          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingTop: 60, paddingBottom: 48, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  headerTitle: { fontSize: Typography['3xl'], fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.75)' },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -24, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.card },
  emailLocked: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 14, marginBottom: Spacing.lg },
  emailText: { flex: 1, fontSize: Typography.base, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: Spacing.md },
  uploadArea: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14 },
  uploadDone: { borderStyle: 'solid', borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  uploadError: { borderColor: Colors.error },
  uploadText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary },
  helperText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginTop: 4 },
  errorText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.error, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12 },
  rolePill: { flex: 1, height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rolePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rolePillText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },
  rolePillTextActive: { color: '#fff' },
  signinRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  signinText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  signinLink: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryLight, textDecorationLine: 'underline' },
});
