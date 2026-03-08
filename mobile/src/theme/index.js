// AUI Carpool Design System
// All design tokens matching Figma mockups exactly

export const Colors = {
  // Primary
  primary: '#1B5E20',
  primaryLight: '#2E7D32',
  primaryDark: '#145214',
  primaryBg: '#F0FDF4',

  // Accent
  accent: '#F59E0B',
  accentLight: '#FEF3C7',

  // Neutrals
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textWhite: '#FFFFFF',

  // Semantic
  error: '#EF4444',
  errorBg: '#FEF2F2',
  success: '#22C55E',
  successBg: '#F0FDF4',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',

  // Map pins
  pinAvailable: '#1B5E20',
  pinAlmostFull: '#F59E0B',
  pinFull: '#6B7280',
};

export const Typography = {
  // Font family
  fontFamily: 'Inter',

  // Font sizes
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 24,
  '5xl': 28,
  '6xl': 32,

  // Font weights
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};
