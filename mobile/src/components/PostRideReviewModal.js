/**
 * components/PostRideReviewModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen modal that appears immediately when a ride completes (either via
 * GPS auto-complete or manual driver action). Each member must rate every other
 * member of the ride — driver rates passengers, passengers rate the driver and
 * optionally each other.
 *
 * DESIGN DECISIONS:
 *
 * 1. One-participant-at-a-time flow:
 *    Showing all participants at once would overwhelm users. Instead the modal
 *    cycles through participants one at a time with a progress indicator.
 *    This matches the Figma mockup (screen 13 — Rating & Reviews).
 *
 * 2. Rating is required, review text is optional:
 *    A 1-5 star rating is mandatory (the core trust metric). Text is optional
 *    so users who want to rate quickly can do so without typing.
 *
 * 3. Skip is allowed:
 *    Users can skip rating a specific person — they just cannot dismiss the
 *    whole modal without either rating everyone or explicitly pressing "Done".
 *    This avoids frustration while maximising review collection.
 *
 * 4. Submitted ratings update immediately via the API response:
 *    The parent screen refreshes the subject's averageRating from the response,
 *    so the profile shows the new score without a separate fetch.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { writeReview } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';

// ── Star rating widget ────────────────────────────────────────────────────────
function StarPicker({ value, onChange, size = 36 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 12 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? Colors.accent : Colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, size = 64 }) {
  const parts    = (name || '').split(' ');
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: Colors.primaryBg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.35, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary }}>
        {initials}
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PostRideReviewModal({ visible, rideId, destination, participants, onDone }) {
  const { user } = useAuth();

  // Filter out the current user from the list of people to rate
  const toRate = (participants || []).filter(p => p.userId !== user?._id?.toString());

  const [currentIdx, setCurrentIdx] = useState(0);
  const [rating, setRating]         = useState(0);
  const [content, setContent]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState({}); // { [userId]: true }

  const current = toRate[currentIdx];
  const total   = toRate.length;
  const isLast  = currentIdx >= total - 1;

  const resetForm = useCallback(() => {
    setRating(0);
    setContent('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!current) return;
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await writeReview({ subjectId: current.userId, rideId, rating, content });
      setSubmitted(prev => ({ ...prev, [current.userId]: true }));
    } catch (err) {
      // 409 = already reviewed (idempotent — treat as success)
      if (err.response?.status !== 409) {
        Alert.alert('Error', err.response?.data?.message || 'Could not submit review. Please try again.');
        setSubmitting(false);
        return;
      }
      setSubmitted(prev => ({ ...prev, [current.userId]: true }));
    }
    setSubmitting(false);
    resetForm();
    if (isLast) {
      onDone();
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [current, rating, content, rideId, isLast, onDone, resetForm]);

  const handleSkip = useCallback(() => {
    resetForm();
    if (isLast) {
      onDone();
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [isLast, onDone, resetForm]);

  if (!visible || !current) return null;

  const roleLabel = current.role === 'Driver' ? 'Driver' : 'Passenger';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDone}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.destinationBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={s.destinationText}>Ride to {destination} completed</Text>
            </View>
            <Text style={s.title}>Rate your {roleLabel.toLowerCase()}</Text>

            {/* Progress dots */}
            <View style={s.progressRow}>
              {toRate.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    i === currentIdx && s.dotActive,
                    submitted[toRate[i]?.userId] && s.dotDone,
                  ]}
                />
              ))}
            </View>
            <Text style={s.progressText}>{currentIdx + 1} of {total}</Text>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {/* Person card */}
            <View style={s.personCard}>
              <Avatar name={current.name} size={72} />
              <Text style={s.personName}>{current.name}</Text>
              <Text style={s.personRole}>{roleLabel}</Text>
            </View>

            {/* Star picker */}
            <Text style={s.label}>Your rating</Text>
            <StarPicker value={rating} onChange={setRating} />

            {/* Optional review text */}
            <Text style={s.label}>Write a review <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={s.textInput}
              placeholder={`How was your experience with ${current.name.split(' ')[0]}?`}
              placeholderTextColor={Colors.textDisabled}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={s.charCount}>{content.length}/300</Text>
          </ScrollView>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.skipBtn} onPress={handleSkip} disabled={submitting}>
              <Text style={s.skipText}>{isLast ? 'Done' : 'Skip'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, rating === 0 && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>{isLast ? 'Submit & Finish' : 'Submit & Continue'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBg,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: Spacing.sm,
  },
  destinationText: {
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.primary,
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  dotDone: {
    backgroundColor: Colors.accent,
  },
  progressText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  personCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  personName: {
    fontSize: Typography.lg,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  personRole: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  label: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  optional: {
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: Colors.background,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textDisabled,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  skipText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: Colors.border,
  },
  submitText: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#fff',
  },
});
