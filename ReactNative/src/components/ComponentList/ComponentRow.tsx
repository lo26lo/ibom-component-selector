/**
 * ComponentRow - Ligne de composant avec checkbox
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../../theme';
import { useHaptic } from '../../hooks';
import { spacing, fontSize, heights } from '../../theme/spacing';
import type { Component } from '../../core/types';

interface ComponentRowProps {
  component: Component;
  isProcessed: boolean;
  onToggleProcessed: (key: string) => void;
  onPress?: (component: Component) => void;
  onLongPress?: (component: Component) => void;
  fontSizeMultiplier?: number;
}

export const ComponentRow = memo(function ComponentRow({
  component,
  isProcessed,
  onToggleProcessed,
  onPress,
  onLongPress,
  fontSizeMultiplier = 1,
}: ComponentRowProps) {
  const { theme, isEinkMode } = useTheme();
  const haptic = useHaptic();

  const componentKey = `${component.value}|${component.footprint}|${component.lcsc}`;

  const handleCheckboxPress = useCallback(() => {
    onToggleProcessed(componentKey);
    if (!isProcessed) {
      haptic.trigger('selection');
    }
  }, [componentKey, onToggleProcessed, isProcessed, haptic]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(component);
    }
  }, [component, onPress]);

  const handleLongPress = useCallback(() => {
    haptic.trigger('medium');
    if (onLongPress) {
      onLongPress(component);
    }
  }, [component, onLongPress, haptic]);

  const fs = fontSize.sm * fontSizeMultiplier;
  const bgColor = isProcessed ? theme.bgProcessed : theme.bgPrimary;

  // Truncate ref if too long
  const refText = component.ref.length > 15
    ? component.ref.substring(0, 12) + '...'
    : component.ref;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderBottomColor: theme.borderLight,
        },
      ]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        onPress={handleCheckboxPress}
        style={[
          styles.checkbox,
          {
            backgroundColor: isProcessed ? theme.bgButtonActive : theme.bgButton,
            borderColor: isEinkMode ? theme.border : 'transparent',
            borderWidth: isEinkMode ? 1 : 0,
          },
        ]}
      >
        <Text style={[styles.checkboxText, { color: theme.textPrimary }]}>
          {isProcessed ? 'X' : ' '}
        </Text>
      </TouchableOpacity>

      {/* Ref */}
      <Text
        style={[styles.ref, { color: theme.textPrimary, fontSize: fs }]}
        numberOfLines={1}
      >
        {refText}
      </Text>

      {/* Value */}
      <Text
        style={[styles.value, { color: theme.textPrimary, fontSize: fs }]}
        numberOfLines={1}
      >
        {component.value?.substring(0, 10) || '-'}
      </Text>

      {/* Footprint */}
      <Text
        style={[styles.footprint, { color: theme.textSecondary, fontSize: fs }]}
        numberOfLines={1}
      >
        {component.footprint?.substring(0, 12) || '-'}
      </Text>

      {/* LCSC */}
      <Text
        style={[styles.lcsc, { color: theme.textSecondary, fontSize: fs }]}
        numberOfLines={1}
      >
        {component.lcsc || '-'}
      </Text>

      {/* Layer */}
      <Text
        style={[styles.layer, { color: theme.textPrimary, fontSize: fs }]}
      >
        {component.layer}
      </Text>

      {/* Qty */}
      <Text
        style={[styles.qty, { color: theme.textPrimary, fontSize: fs }]}
      >
        {component.qty || 1}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: heights.row,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderRadius: 4,
  },
  checkboxText: {
    fontWeight: 'bold',
    fontSize: fontSize.md,
  },
  ref: {
    flex: 0.12,
    fontWeight: '500',
  },
  value: {
    flex: 0.2,
  },
  footprint: {
    flex: 0.25,
  },
  lcsc: {
    flex: 0.2,
  },
  layer: {
    flex: 0.08,
    textAlign: 'center',
  },
  qty: {
    flex: 0.07,
    textAlign: 'center',
  },
});

export default ComponentRow;
