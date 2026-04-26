/**
 * components/ReportUserModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable modal for filing a user report.
 * Used in:
 *   • PostRideReviewModal — "Report [Name]" link below the review form
 *   • MessagesScreen (ChatView) — long-press on a message bubble or header ⋮ menu
 *
 * Props
 * ─────
 * visible         boolean
 * onClose         () => void
 * subjectId       string  — MongoDB _id of reported user
 * subjectName     string  — Display name (for UI copy)
 * context         'Ride' | 'Message'
 * rideId          string?  — required when context === 'Ride'
 * messageSnapshot { messageId, content, sentAt }? — optional for Message context
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { createReport } from '../services/reportService';

const ALL_CATEGORIES = [
  'Harassment',
  'Inappropriate Behavior',
  'Dangerous Driving',
  'Fraud or Scam',
  'Spam',
  'Other',
];

// "Dangerous Driving" only makes sense for ride context
const getCategories = (context) =>
  context === 'Ride' ? ALL_CATEGORIES : ALL_CATEGORIES.filter(c => c !== 'Dangerous Driving');

export default function ReportUserModal({
  visible,
  onClose,
  subjectId,
  subjectName,
  context = 'Message',
  rideId = null,
  messageSnapshot = null,
}) {
  const [category, setCategory]       = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [localVisible, setLocalVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(400);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, mass: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => setLocalVisible(false));
    }
  }, [visible]);

  const firstName = (subjectName || 'this user').split(' ')[0];
  const categories = getCategories(context);

  const reset = useCallback(() => {
    setCategory('');
    setDescription('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSubmit = useCallback(async () => {
    if (!category) {
      Alert.alert('Select a category', 'Please choose a reason for your report.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description required', 'Please briefly describe what happened.');
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        subjectId,
        context,
        rideId: rideId || undefined,
        messageSnapshot: messageSnapshot || undefined,
        category,
        description: description.trim(),
      });
      reset();
      onClose();
      Alert.alert(
        'Report submitted',
        'Thank you — our team will review your report and take action if needed.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [category, description, subjectId, context, rideId, messageSnapshot, reset, onClose]);

  return (
    <Modal visible={localVisible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Animated backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim }]} pointerEvents="none" />
      {/* Sheet with keyboard handling */}
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.flagContainer}>
              <Ionicons name="flag" size={26} color={Colors.error} />
            </View>
            <Text style={s.title}>Report {firstName}</Text>
            <Text style={s.subtitle}>
              Your report is anonymous and will be reviewed by the AUI Carpool team.
            </Text>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Message snapshot preview (if provided) */}
            {messageSnapshot?.content ? (
              <View style={s.snapshotSection}>
                <Text style={s.sectionLabel}>Reported message</Text>
                <View style={s.snapshotBubble}>
                  <Text style={s.snapshotText}>{messageSnapshot.content}</Text>
                  {messageSnapshot.sentAt ? (
                    <Text style={s.snapshotTime}>
                      {new Date(messageSnapshot.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Category */}
            <Text style={s.sectionLabel}>Reason for report</Text>
            <View style={s.pills}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.pill, category === cat && s.pillActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={s.sectionLabel}>
              Description <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={s.textInput}
              placeholder={`What did ${firstName} do? Please be specific so our team can take action.`}
              placeholderTextColor={Colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={s.charCount}>{description.length}/500</Text>

            {/* Disclaimer */}
            <Text style={s.disclaimer}>
              False reports may result in your account being restricted.
            </Text>
          </ScrollView>

          {/* Submit */}
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleClose} disabled={submitting}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, (!category || !description.trim()) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !category || !description.trim()}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>Submit Report</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.lg,
    top: Spacing.lg,
  },
  flagContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },

  // Message snapshot preview
  snapshotSection: {
    marginBottom: Spacing.md,
  },
  snapshotBubble: {
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  snapshotText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  snapshotTime: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },

  // Category pills
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  pillText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.error,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Description input
  textInput: {
    backgroundColor: Colors.inputBg || Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  charCount: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textDisabled,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: Spacing.md,
  },

  disclaimer: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.sm,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#fff',
  },
});
