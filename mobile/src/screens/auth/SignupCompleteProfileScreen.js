import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StepIndicator from '../../components/common/StepIndicator';

export default function SignupCompleteProfileScreen({ navigation, route }) {
  const email = route?.params?.email || 'yourname@aui.ma';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cin: '',
    role: 'Passenger', // 'Passenger' | 'Driver'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.password || form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.cin.trim()) e.cin = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validate()) return;
    setLoading(true);
    // TODO: call Auth Service POST /auth/register
    // Body: { email, firstName, lastName, password, phone, cin, role }
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Home');
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Green header */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>Almost there!</Text>
        </LinearGradient>

        {/* Card */}
        <View style={styles.card}>
          <StepIndicator currentStep={3} totalSteps={3} />

          {/* Verified email — locked */}
          <Input
            label="AUI Email"
            value={email}
            locked
            verified
            style={styles.field}
          />

          {/* Name row */}
          <View style={styles.row}>
            <Input
              label="First Name"
              placeholder="Ghita"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              error={errors.firstName}
              autoCapitalize="words"
              style={[styles.field, styles.halfField]}
            />
            <View style={styles.rowGap} />
            <Input
              label="Last Name"
              placeholder="Nafa"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              error={errors.lastName}
              autoCapitalize="words"
              style={[styles.field, styles.halfField]}
            />
          </View>

          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            secureTextEntry
            error={errors.password}
            style={styles.field}
          />

          <Input
            label="Confirm Password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChangeText={(v) => update('confirmPassword', v)}
            secureTextEntry
            error={errors.confirmPassword}
            style={styles.field}
          />

          <Input
            label="Phone Number"
            placeholder="+212 6XX XXX XXX"
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            keyboardType="phone-pad"
            error={errors.phone}
            style={styles.field}
          />

          <Input
            label="National ID (CIN)"
            placeholder="AB123456"
            value={form.cin}
            onChangeText={(v) => update('cin', v)}
            autoCapitalize="characters"
            helperText="Your CIN is used for identity purposes only"
            error={errors.cin}
            style={styles.field}
          />

          {/* Role selector */}
          <Text style={styles.roleLabel}>I am a...</Text>
          <View style={styles.roleRow}>
            {['Passenger', 'Driver'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.rolePill,
                  form.role === r && styles.rolePillActive,
                ]}
                onPress={() => update('role', r)}
              >
                <Ionicons
                  name={r === 'Passenger' ? 'person-outline' : 'car-outline'}
                  size={16}
                  color={form.role === r ? Colors.textWhite : Colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  styles.rolePillText,
                  form.role === r && styles.rolePillTextActive,
                ]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            label="Create My Account"
            onPress={handleCreateAccount}
            loading={loading}
            style={styles.createButton}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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

  header: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography['4xl'],
    fontFamily: 'Inter_700Bold',
    color: Colors.textWhite,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.md,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
  },

  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -24,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },

  field: { marginBottom: 0 },

  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  rowGap: { width: Spacing.sm },
  halfField: { flex: 1 },

  roleLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  rolePill: {
    flex: 1,
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rolePillText: {
    fontSize: Typography.md,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  rolePillTextActive: {
    color: Colors.textWhite,
  },

  createButton: {
    marginBottom: Spacing.lg,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing.xs,
  },
  loginText: {
    fontSize: Typography.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
});
