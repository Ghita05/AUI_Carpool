import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { recoverPassword } from '../../services/authService';

const isAuiEmail = (email) => /^[^\s@]+@aui\.ma$/i.test(email.trim());

function ForgotPasswordModal({ visible, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) { setError('Email is required'); return; }
    if (!isAuiEmail(email)) { setError('Please use your AUI email (@aui.ma)'); return; }
    setLoading(true);
    try {
      await recoverPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration (matches backend behavior)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setSent(false); setEmail(''); setError(''); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {sent ? (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="mail-outline" size={48} color={Colors.primary} />
              <Text style={styles.modalTitle}>Reset Link Sent</Text>
              <Text style={styles.modalSub}>We've sent a password reset link to <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{email}</Text>. Check your inbox.</Text>
              <Button label="Back to Login" onPress={handleClose} style={{ marginTop: Spacing.lg, width: '100%' }} />
            </View>
          ) : (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>Enter your AUI email and we'll send you a link to reset your password.</Text>
              <Input label="AUI Email" placeholder="yourname@aui.ma" value={email} onChangeText={(t) => { setEmail(t); setError(''); }} keyboardType="email-address" error={error} />
              <Button label="Send Reset Link" onPress={handleSend} loading={loading} style={{ marginTop: Spacing.md }} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgot, setShowForgot] = useState(false);

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!isAuiEmail(email)) e.email = 'Please use your AUI institutional email (@aui.ma)';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.replace('Main');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      // Show the backend's error message in the appropriate field
      if (msg.toLowerCase().includes('verify')) {
        setErrors({ email: msg });
      } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid')) {
        setErrors({ password: msg });
      } else {
        setErrors({ password: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="car-outline" size={36} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.headerTitle}>AUI Carpool</Text>
          <Text style={styles.headerSubtitle}>Welcome back</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Input label="AUI Email" placeholder="yourname@aui.ma" value={email} onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: null }); }} keyboardType="email-address" error={errors.email} />
          <Input label="Password" placeholder="Enter your password" value={password} onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: null }); }} secureTextEntry error={errors.password} />

          <TouchableOpacity onPress={() => setShowForgot(true)} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Log In" onPress={handleLogin} loading={loading} style={styles.loginButton} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignupEmail')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  header: { paddingTop: 60, paddingBottom: 60, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  headerTitle: { fontSize: Typography['3xl'], fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -24, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.card },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.sm, marginBottom: Spacing.xl },
  forgotText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primaryLight },
  loginButton: { marginBottom: Spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.sm, fontSize: Typography.sm, color: Colors.textSecondary },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: Spacing.sm },
  signupText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  signupLink: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryLight, textDecorationLine: 'underline' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalSub: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
});
