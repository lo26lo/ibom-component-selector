/**
 * LoadingScreen - Écran de chargement initial
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { spacing, fontSize } from '../theme/spacing';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  const { theme, isEinkMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        IBom Selector
      </Text>
      <ActivityIndicator
        size="large"
        color={isEinkMode ? '#000000' : theme.accent}
        style={styles.spinner}
      />
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: spacing.xl,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  message: {
    fontSize: fontSize.md,
  },
});

export default LoadingScreen;
