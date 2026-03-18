import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../theme';

export default function Button({
  label,
  onPress,
  variant = 'primary', // 'primary' | 'outline' | 'ghost'
  size = 'md',         // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  textStyle,
}) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    disabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.textWhite : Colors.primary}
          size="small"
        />
      ) : (
        <Text style={labelStyles}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  fullWidth: {
    width: '100%',
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: { height: 40, paddingHorizontal: Spacing.lg },
  size_md: { height: 48, paddingHorizontal: Spacing.xl },
  size_lg: { height: 54, paddingHorizontal: Spacing.xl },

  // Disabled
  disabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
    opacity: 0.6,
  },

  // Labels
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  label_primary: { color: Colors.textWhite },
  label_outline: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  labelDisabled: { color: Colors.textDisabled },

  // Label sizes
  labelSize_sm: { fontSize: Typography.md },
  labelSize_md: { fontSize: Typography.lg },
  labelSize_lg: { fontSize: Typography.xl },
});
