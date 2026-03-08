import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../../theme';

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  helperText,
  error,
  verified = false,
  locked = false,
  rightIcon,
  style,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPasswordField = secureTextEntry;
  const isEmail = keyboardType === 'email-address';

  // Determine border color state
  const getBorderColor = () => {
    if (error) return Colors.error;
    if (verified) return Colors.primary;
    if (focused) return Colors.primary;
    return Colors.border;
  };

  const getBackgroundColor = () => {
    if (verified) return Colors.primaryBg;
    if (locked) return Colors.divider;
    return Colors.surface;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <View style={[
        styles.inputWrapper,
        {
          borderColor: getBorderColor(),
          borderWidth: focused || verified || error ? 2 : 1,
          backgroundColor: getBackgroundColor(),
        }
      ]}>
        {/* Left icon — envelope for email, lock for password */}
        {isEmail && (
          <Ionicons
            name="mail-outline"
            size={18}
            color={focused ? Colors.primary : Colors.textDisabled}
            style={styles.leftIcon}
          />
        )}
        {isPasswordField && (
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={focused ? Colors.primary : Colors.textDisabled}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordField && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!locked}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.verifiedText}> Verified</Text>
          </View>
        )}

        {/* Password toggle */}
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Custom right icon */}
        {rightIcon && !isPasswordField && !verified && (
          <View style={styles.iconButton}>{rightIcon}</View>
        )}
      </View>

      {/* Helper or error text */}
      {(helperText || error) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verifiedText: {
    fontSize: Typography.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  eyeIcon: {
    fontSize: 16,
  },
  helperText: {
    fontSize: Typography.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.error,
  },
});
