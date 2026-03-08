import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StepIndicator from '../../components/common/StepIndicator';

export default function SignupEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidAuiEmail = (val) =>
    /^[^\s@]+@aui\.ma$/.test(val.toLowerCase().trim());

  const handleSendLink = async () => {
    if (!email) {
      setError('Please enter your AUI email address');
      return;
    }
    if (!isValidAuiEmail(email)) {
      setError('Please use your AUI institutional email (@aui.ma)');
      return;
    }
    setError('');
    setLoading(true);
    // TODO: call Auth Service POST /auth/send-verification
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('SignupCheckInbox', { email: email.trim() });
    }, 1200);
  };

  const getEmailState = () => {
    if (!email) return 'default';
    if (isValidAuiEmail(email)) return 'valid';
    if (email.length > 4) return 'invalid';
    return 'default';
  };

  const emailState = getEmailState();

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
          <Text style={styles.headerTitle}>Join AUI Carpool</Text>
          <Text style={styles.headerSubtitle}>Verify your AUI identity to get started</Text>
        </LinearGradient>

        {/* Card */}
        <View style={styles.card}>
          <StepIndicator currentStep={1} totalSteps={3} />

          <Text style={styles.fieldLabel}>Enter your AUI email:</Text>

          <Input
            placeholder="yourname@aui.ma"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError('');
            }}
            keyboardType="email-address"
            error={emailState === 'invalid' ? 'Please use your AUI institutional email (@aui.ma)' : error}
            style={styles.emailInput}
          />

          <Button
            label="Send Verification Link"
            onPress={handleSendLink}
            loading={loading}
            disabled={emailState === 'invalid'}
            style={styles.sendButton}
          />

          {/* Already have account */}
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
  scroll: { flexGrow: 1 },

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
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -24,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },

  fieldLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  emailInput: {
    marginBottom: Spacing.lg,
  },

  sendButton: {
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
