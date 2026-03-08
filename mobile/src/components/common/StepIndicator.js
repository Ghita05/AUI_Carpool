import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme';

export default function StepIndicator({ currentStep = 1, totalSteps = 3 }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isLast = stepNumber === totalSteps;

        return (
          <View key={stepNumber} style={styles.stepWrapper}>
            {/* Dot */}
            <View style={[
              styles.dot,
              (isCompleted || isActive) && styles.dotActive,
              !isCompleted && !isActive && styles.dotInactive,
            ]} />

            {/* Connecting line (not after last dot) */}
            {!isLast && (
              <View style={[
                styles.line,
                isCompleted && styles.lineActive,
                !isCompleted && styles.lineInactive,
              ]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.border,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  line: {
    width: 48,
    height: 2,
  },
  lineActive: {
    backgroundColor: Colors.primary,
  },
  lineInactive: {
    backgroundColor: Colors.border,
  },
});
