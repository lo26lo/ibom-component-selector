/**
 * ThemedToggle - Toggle button avec thème e-ink [X] / [ ]
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius, heights } from '../../theme/spacing';

interface ThemedToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ThemedToggle({
  label,
  value,
  onValueChange,
  disabled = false,
}: ThemedToggleProps) {
  const { theme, isEinkMode } = useTheme();

  const toggleText = value ? theme.checkboxOn : theme.checkboxOff;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: theme.textPrimary, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => onValueChange(!value)}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.toggle,
          {
            backgroundColor: value ? theme.bgButtonActive : theme.bgButton,
            borderColor: isEinkMode ? theme.border : 'transparent',
            borderWidth: isEinkMode ? 1.5 : 0,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            { color: theme.textPrimary },
          ]}
        >
          {toggleText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: heights.row + 10,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    flex: 1,
  },
  toggle: {
    minWidth: 60,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  toggleText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

export default ThemedToggle;
