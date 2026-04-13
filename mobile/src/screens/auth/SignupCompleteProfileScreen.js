import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import ImagePickerModal from '../../components/ImagePickerModal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StepIndicator from '../../components/common/StepIndicator';
import { register, previewCashWalletOCR, previewDriverLicenseOCR, previewRegCardOCR } from '../../services/authService';

const STEPS_PASSENGER = 3; // Personal → CashWallet → Role
const STEPS_DRIVER = 5;    // Personal → CashWallet → Role → License → Vehicle Card

export default function SignupCompleteProfileScreen({ navigation, route }) {
  const email = route?.params?.email || 'yourname@aui.ma';
  const scrollRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', password: '', confirmPassword: '',
    phone: '', auiId: '', role: '', gender: '',
  });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // CashWallet OCR state
  const [cashwalletUploaded, setCashwalletUploaded] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showCashwalletPicker, setShowCashwalletPicker] = useState(false);

  // Driver license OCR state
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [licenseOcrLoading, setLicenseOcrLoading] = useState(false);
  const [showLicensePicker, setShowLicensePicker] = useState(false);
  const [licenseData, setLicenseData] = useState({ cni: '', licenseNumber: '' });

  // Vehicle card OCR state
  const [vehicleCardUploaded, setVehicleCardUploaded] = useState(false);
  const [vehicleOcrLoading, setVehicleOcrLoading] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: null })); };
  const totalSteps = form.role === 'Driver' ? STEPS_DRIVER : STEPS_PASSENGER;

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  // ── Step validation ──
  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!form.password || form.password.length < 8) e.password = 'Min. 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!form.phone.trim()) e.phone = 'Required';
      if (!form.gender) e.gender = 'Please select your gender';
    } else if (step === 2) {
      if (!cashwalletUploaded) e.cashwallet = 'Please upload your CashWallet scan';
      if (!form.auiId.trim()) e.auiId = 'AUI ID is required';
    } else if (step === 3) {
      if (!form.role) e.role = 'Please select a role';
    } else if (step === 4) {
      if (!licenseUploaded) e.license = 'Please upload your driver license';
    } else if (step === 5) {
      if (!vehicleCardUploaded) e.vehicleCard = 'Please upload your vehicle registration card';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Navigation ──
  const handleNext = () => {
    if (!validateStep()) return;
    // If passenger selected at step 3, go directly to submit
    if (step === 3 && form.role === 'Passenger') {
      handleSubmit();
      return;
    }
    // If driver at step 5, submit
    if (step === 5) {
      handleSubmit();
      return;
    }
    setStep(s => s + 1);
    scrollToTop();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
      setErrors({});
      scrollToTop();
    }
  };

  const handleSwitchToPassenger = () => {
    Alert.alert(
      'Continue as Passenger?',
      'You can always upgrade to a Driver later from your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, continue as Passenger',
          onPress: () => {
            update('role', 'Passenger');
            setStep(3);
            scrollToTop();
          },
        },
      ]
    );
  };

  // ── CashWallet OCR ──
  const processCashwalletImage = async (uri) => {
    setOcrLoading(true);
    try {
      const res = await previewCashWalletOCR(uri);
      const ocr = res.data?.ocrResult;

      if (ocr?.verified) {
        const enteredName = `${form.firstName} ${form.lastName}`.trim();
        if (ocr.holderName && enteredName) {
          const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
          const ocrWords = normalize(ocr.holderName).split(/\s+/).filter(Boolean);
          const enteredWords = normalize(enteredName).split(/\s+/).filter(Boolean);
          const match = enteredWords.every(w => ocrWords.some(ow => ow === w || ow.includes(w) || w.includes(ow)));
          if (!match) {
            Alert.alert('Name Mismatch', `The name on your CashWallet (${ocr.holderName}) does not match what you entered (${enteredName}).\n\nPlease upload your own CashWallet card.`);
            setCashwalletUploaded(false);
            setOcrLoading(false);
            return;
          }
        }
        if (ocr.studentId) update('auiId', ocr.studentId);
        if (ocr.isAuiCard === false) {
          Alert.alert('Not an AUI Card', 'This does not appear to be an AUI CashWallet. Please upload your AUI student card.');
          setCashwalletUploaded(false);
          setOcrLoading(false);
          return;
        }
        setCashwalletUploaded(true);
        Alert.alert('CashWallet Verified', `Name: ${ocr.holderName || 'N/A'}\nStudent ID: ${ocr.studentId || 'N/A'}\n\nYour AUI ID has been auto-filled.`);
      } else {
        setCashwalletUploaded(true);
        Alert.alert('Upload Saved', 'Could not auto-extract info. Please ensure your AUI ID is correct.');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg) {
        Alert.alert('Upload Failed', msg);
        setCashwalletUploaded(false);
      } else {
        setCashwalletUploaded(true);
        Alert.alert('OCR Unavailable', 'Image saved but OCR failed. Please verify your AUI ID manually.');
      }
    } finally {
      setOcrLoading(false);
    }
  };

  // ── Driver License OCR ──
  const processLicenseImage = async (uri) => {
    setLicenseOcrLoading(true);
    try {
      const res = await previewDriverLicenseOCR(uri);
      const ocr = res.data?.ocrResult;

      if (ocr?.verified) {
        const enteredName = `${form.firstName} ${form.lastName}`.trim();
        if (ocr.holderName && enteredName) {
          const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
          const ocrWords = normalize(ocr.holderName).split(/\s+/).filter(Boolean);
          const enteredWords = normalize(enteredName).split(/\s+/).filter(Boolean);
          const match = enteredWords.every(w => ocrWords.some(ow => ow === w || ow.includes(w) || w.includes(ow)));
          if (!match) {
            Alert.alert('Name Mismatch', `The name on your license (${ocr.holderName}) does not match your entered name (${enteredName}).`);
            setLicenseUploaded(false);
            setLicenseOcrLoading(false);
            return;
          }
        }
        setLicenseData({ cni: ocr.cni || '', licenseNumber: ocr.licenseNumber || '' });
        setLicenseUploaded(true);
        Alert.alert('License Verified', `Name: ${ocr.holderName || 'N/A'}\nLicense #: ${ocr.licenseNumber || 'N/A'}\nCNI: ${ocr.cni || 'N/A'}`);
      } else {
        Alert.alert('Verification Failed', 'Could not verify your driver license. Please take a clearer photo.');
        setLicenseUploaded(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      Alert.alert('Upload Failed', msg || 'Could not process driver license image.');
      setLicenseUploaded(false);
    } finally {
      setLicenseOcrLoading(false);
    }
  };

  // ── Vehicle Registration Card OCR ──
  const processVehicleCardImage = async (uri) => {
    setVehicleOcrLoading(true);
    try {
      const res = await previewRegCardOCR(uri);
      const ocr = res.data?.ocrResult;

      if (ocr?.verified && ocr.licensePlate) {
        setVehiclePlate(ocr.licensePlate);
        setVehicleCardUploaded(true);
        Alert.alert('Vehicle Card Verified', `License Plate: ${ocr.licensePlate}${ocr.ownerName ? '\nOwner: ' + ocr.ownerName : ''}${ocr.expiryDate ? '\nValid until: ' + ocr.expiryDate : ''}`);
      } else {
        Alert.alert('Verification Failed', 'Could not read your vehicle registration card. Please take a clearer photo.');
        setVehicleCardUploaded(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      Alert.alert('Upload Failed', msg || 'Could not process registration card image.');
      setVehicleCardUploaded(false);
    } finally {
      setVehicleOcrLoading(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: form.password,
        phoneNumber: form.phone.trim(),
        auiId: form.auiId.trim(),
        role: form.role,
        gender: form.gender,
      });
      Alert.alert(
        'Account Created!',
        'Please check your @aui.ma inbox and click the verification link, then log in.',
        [{ text: 'Go to Login', onPress: () => navigation.replace('Login') }]
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step subtitles ──
  const stepSubtitles = {
    1: 'Personal Information',
    2: 'Identity Verification',
    3: 'Choose Your Role',
    4: 'Driver License',
    5: 'Vehicle Registration',
  };

  // ── Button label ──
  const getButtonLabel = () => {
    if (step === 3 && form.role === 'Passenger') return 'Create My Account';
    if (step === 5) return 'Create My Account';
    return 'Continue';
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>{stepSubtitles[step]}</Text>
        </LinearGradient>

        <View style={styles.card}>
          <StepIndicator currentStep={step} totalSteps={totalSteps} />

          {/* Verified email (always shown) */}
          <View style={styles.emailLocked}>
            <Ionicons name="mail" size={14} color={Colors.primary} />
            <Text style={styles.emailText}>{email}</Text>
            <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={14} color={Colors.primary} /><Text style={styles.verifiedText}>Verified</Text></View>
          </View>

          {/* ═══ STEP 1: Personal Info ═══ */}
          {step === 1 && (
            <>
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
              <Text style={styles.fieldLabel}>GENDER</Text>
              <View style={styles.roleRow}>
                {[{ label: 'Male', icon: 'male-outline' }, { label: 'Female', icon: 'female-outline' }].map(({ label, icon }) => (
                  <TouchableOpacity key={label} style={[styles.rolePill, form.gender === label && styles.rolePillActive]} onPress={() => update('gender', label)}>
                    <Ionicons name={icon} size={16} color={form.gender === label ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.rolePillText, form.gender === label && styles.rolePillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </>
          )}

          {/* ═══ STEP 2: CashWallet ═══ */}
          {step === 2 && (
            <>
              <Text style={styles.fieldLabel}>CASHWALLET</Text>
              <TouchableOpacity style={[styles.uploadArea, cashwalletUploaded && styles.uploadDone, errors.cashwallet && styles.uploadError]} onPress={() => setShowCashwalletPicker(true)} disabled={ocrLoading}>
                {ocrLoading ? <ActivityIndicator size="small" color={Colors.primary} /> :
                <Ionicons name={cashwalletUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={cashwalletUploaded ? Colors.primary : Colors.textSecondary} />}
                <Text style={[styles.uploadText, cashwalletUploaded && { color: Colors.primary }]}>
                  {ocrLoading ? 'Verifying with OCR...' : cashwalletUploaded ? 'CashWallet verified ✓' : 'Upload a clear picture of your CashWallet'}
                </Text>
              </TouchableOpacity>
              {errors.cashwallet && <Text style={styles.errorText}>{errors.cashwallet}</Text>}
              <Text style={styles.helperText}>Your CashWallet is used for identity verification. Your AUI ID will be auto-filled.</Text>

              <Input label="AUI Student ID" placeholder="Auto-filled from CashWallet" value={form.auiId} onChangeText={t => update('auiId', t)} keyboardType="number-pad" error={errors.auiId} />
            </>
          )}

          {/* ═══ STEP 3: Role Selection ═══ */}
          {step === 3 && (
            <>
              <Text style={styles.fieldLabel}>I AM A...</Text>
              <View style={styles.roleRow}>
                {[{ label: 'Passenger', icon: 'person-outline', desc: 'Find and book rides' }, { label: 'Driver', icon: 'car-outline', desc: 'Offer rides and earn' }].map(({ label, icon, desc }) => (
                  <TouchableOpacity key={label} style={[styles.roleCard, form.role === label && styles.roleCardActive]} onPress={() => update('role', label)}>
                    <Ionicons name={icon} size={28} color={form.role === label ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.roleCardLabel, form.role === label && styles.roleCardLabelActive]}>{label}</Text>
                    <Text style={[styles.roleCardDesc, form.role === label && { color: 'rgba(255,255,255,0.8)' }]}>{desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
              {form.role === 'Driver' && (
                <Text style={styles.helperText}>As a driver, you'll need to verify your driver license and vehicle registration card in the next steps.</Text>
              )}
            </>
          )}

          {/* ═══ STEP 4: Driver License ═══ */}
          {step === 4 && (
            <>
              <Text style={styles.fieldLabel}>DRIVER LICENSE</Text>
              <TouchableOpacity style={[styles.uploadArea, licenseUploaded && styles.uploadDone, errors.license && styles.uploadError]} onPress={() => setShowLicensePicker(true)} disabled={licenseOcrLoading}>
                {licenseOcrLoading ? <ActivityIndicator size="small" color={Colors.primary} /> :
                <Ionicons name={licenseUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={licenseUploaded ? Colors.primary : Colors.textSecondary} />}
                <Text style={[styles.uploadText, licenseUploaded && { color: Colors.primary }]}>
                  {licenseOcrLoading ? 'Verifying with OCR...' : licenseUploaded ? 'License verified ✓' : 'Upload a clear picture of your driver license'}
                </Text>
              </TouchableOpacity>
              {errors.license && <Text style={styles.errorText}>{errors.license}</Text>}
              <Text style={styles.helperText}>We extract your CNIE number and license number automatically.</Text>

              {licenseUploaded && (
                <View style={styles.ocrInfoBox}>
                  <View style={styles.ocrInfoRow}>
                    <Ionicons name="card-outline" size={16} color={Colors.primary} />
                    <Text style={styles.ocrInfoLabel}>CNI:</Text>
                    <Text style={styles.ocrInfoValue}>{licenseData.cni || 'N/A'}</Text>
                  </View>
                  <View style={styles.ocrInfoRow}>
                    <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                    <Text style={styles.ocrInfoLabel}>License #:</Text>
                    <Text style={styles.ocrInfoValue}>{licenseData.licenseNumber || 'N/A'}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.switchLink} onPress={handleSwitchToPassenger}>
                <Ionicons name="arrow-back-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.switchLinkText}>Continue as Passenger instead</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ═══ STEP 5: Vehicle Registration Card ═══ */}
          {step === 5 && (
            <>
              <Text style={styles.fieldLabel}>VEHICLE REGISTRATION CARD</Text>
              <TouchableOpacity style={[styles.uploadArea, vehicleCardUploaded && styles.uploadDone, errors.vehicleCard && styles.uploadError]} onPress={() => setShowVehiclePicker(true)} disabled={vehicleOcrLoading}>
                {vehicleOcrLoading ? <ActivityIndicator size="small" color={Colors.primary} /> :
                <Ionicons name={vehicleCardUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={vehicleCardUploaded ? Colors.primary : Colors.textSecondary} />}
                <Text style={[styles.uploadText, vehicleCardUploaded && { color: Colors.primary }]}>
                  {vehicleOcrLoading ? 'Verifying with OCR...' : vehicleCardUploaded ? 'Vehicle card verified ✓' : 'Upload your Carte Grise'}
                </Text>
              </TouchableOpacity>
              {errors.vehicleCard && <Text style={styles.errorText}>{errors.vehicleCard}</Text>}
              <Text style={styles.helperText}>The license plate will be extracted automatically from your Carte Grise.</Text>

              {vehicleCardUploaded && vehiclePlate && (
                <View style={styles.ocrInfoBox}>
                  <View style={styles.ocrInfoRow}>
                    <Ionicons name="car-outline" size={16} color={Colors.primary} />
                    <Text style={styles.ocrInfoLabel}>License Plate:</Text>
                    <Text style={styles.ocrInfoValue}>{vehiclePlate}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.switchLink} onPress={handleSwitchToPassenger}>
                <Ionicons name="arrow-back-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.switchLinkText}>Continue as Passenger instead</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Navigation buttons ── */}
          <View style={styles.navRow}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Button label={getButtonLabel()} onPress={handleNext} loading={loading} style={{ marginTop: step === 1 ? Spacing.lg : 0 }} />
            </View>
          </View>

          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Image Pickers */}
      <ImagePickerModal visible={showCashwalletPicker} onClose={() => setShowCashwalletPicker(false)} onImage={processCashwalletImage} aspect={[86, 54]} title="Upload CashWallet" />
      <ImagePickerModal visible={showLicensePicker} onClose={() => setShowLicensePicker(false)} onImage={processLicenseImage} aspect={[86, 54]} title="Upload Driver License" />
      <ImagePickerModal visible={showVehiclePicker} onClose={() => setShowVehiclePicker(false)} onImage={processVehicleCardImage} aspect={[86, 54]} title="Upload Registration Card" />
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
  roleCard: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', gap: 8 },
  roleCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleCardLabel: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  roleCardLabelActive: { color: '#fff' },
  roleCardDesc: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  ocrInfoBox: { backgroundColor: Colors.primaryBg, borderRadius: Radius.sm, padding: Spacing.md, marginTop: Spacing.md, gap: 8 },
  ocrInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ocrInfoLabel: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },
  ocrInfoValue: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  switchLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg, alignSelf: 'center' },
  switchLinkText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary, textDecorationLine: 'underline' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.sm },
  backBtnText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
  signinRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  signinText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  signinLink: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primaryLight, textDecorationLine: 'underline' },
});
