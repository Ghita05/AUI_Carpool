import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import StepIndicator from '../../components/common/StepIndicator';

export default function SignupCheckInboxScreen({ navigation, route }) {
  const email = route?.params?.email || 'yourname@aui.ma';
  const [resendCooldown, setResendCooldown] = useState(false);

  const handleResend = () => {
    if (resendCooldown) return;
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 30000);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <Text style={styles.headerTitle}>Check Your Inbox</Text>
          <Text style={styles.headerSubtitle}>One step closer</Text>
        </LinearGradient>

        <View style={styles.card}>
          <StepIndicator currentStep={2} totalSteps={3} />

          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={36} color={Colors.primary} />
          </View>

          <Text style={styles.heading}>Verification link sent!</Text>
          <Text style={styles.sub}>We sent a link to</Text>
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.instruction}>Click the link in your inbox to continue</Text>

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown}>
              <Text style={[styles.resendLink, resendCooldown && styles.resendDisabled]}>
                {resendCooldown ? 'Link sent!' : 'Resend verification link'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.changeRow}>
            <Text style={styles.changePrompt}>Wrong email address? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.changeLink}>Change it</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('SignupCompleteProfile', { email })} style={styles.continueButton}>
            <Text style={styles.continueText}>I've verified my email →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  header: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  headerTitle: { fontSize: Typography['4xl'], fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.75)' },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -24, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.card, alignItems: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  heading: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  sub: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  emailText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs, textDecorationLine: 'underline' },
  instruction: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  resendPrompt: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  resendLink: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryLight, textDecorationLine: 'underline' },
  resendDisabled: { color: Colors.success, textDecorationLine: 'none' },
  divider: { width: '100%', height: 1, backgroundColor: Colors.border, marginBottom: Spacing.lg },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  changePrompt: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  changeLink: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryLight, textDecorationLine: 'underline' },
  continueButton: { paddingVertical: Spacing.sm },
  continueText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },
});
