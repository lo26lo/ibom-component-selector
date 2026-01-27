/**
 * AnimatedProgress - Barre de progression avec animation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AnimatedProgressProps {
  current: number;
  total: number;
  showLabel?: boolean;
  height?: number;
  animated?: boolean;
}

export function AnimatedProgress({
  current,
  total,
  showLabel = true,
  height = 8,
  animated = true,
}: AnimatedProgressProps) {
  const { theme, isEinkMode } = useTheme();

  const progress = total > 0 ? current / total : 0;
  const percentage = Math.round(progress * 100);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, {
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const fillColor = isEinkMode
    ? '#000000'
    : progress >= 1
    ? theme.bgButtonActive
    : theme.bgButton;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: isEinkMode ? '#e0e0e0' : theme.bgSecondary,
            borderColor: isEinkMode ? '#000000' : 'transparent',
            borderWidth: isEinkMode ? 1 : 0,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height: height - (isEinkMode ? 2 : 0),
              backgroundColor: fillColor,
            },
            animatedStyle,
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {current}/{total} ({percentage}%)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: borderRadius.sm,
  },
  label: {
    fontSize: fontSize.xs,
    minWidth: 80,
    textAlign: 'right',
  },
});

export default AnimatedProgress;
