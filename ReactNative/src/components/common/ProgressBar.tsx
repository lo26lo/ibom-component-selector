/**
 * ProgressBar - Barre de progression thématisée
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface ProgressBarProps {
  current: number;
  total: number;
  showText?: boolean;
  height?: number;
}

export function ProgressBar({
  current,
  total,
  showText = true,
  height = 20,
}: ProgressBarProps) {
  const { theme, isEinkMode } = useTheme();

  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: theme.bgSecondary,
            borderColor: isEinkMode ? theme.border : 'transparent',
            borderWidth: isEinkMode ? 1 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: isEinkMode ? theme.textPrimary : theme.bgButtonActive,
            },
          ]}
        />
      </View>
      {showText && (
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          {current}/{total}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  text: {
    fontSize: fontSize.sm,
    minWidth: 50,
    textAlign: 'right',
  },
});

export default ProgressBar;
