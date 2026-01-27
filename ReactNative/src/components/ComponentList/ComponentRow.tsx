/**
 * ComponentRow - Ligne de composant avec double-tap pour marquer traité
 */

import React, { useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
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
  const lastTapRef = useRef<number>(0);

  const componentKey = `${component.value}|${component.footprint}|${component.lcsc}`;

  // Double-tap pour basculer l'état traité
  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double-tap détecté - basculer traité
      onToggleProcessed(componentKey);
      if (!isProcessed) {
        haptic.trigger('selection');
      }
      lastTapRef.current = 0; // Reset pour éviter les triples
    } else {
      // Premier tap - appeler onPress si défini
      lastTapRef.current = now;
      if (onPress) {
        onPress(component);
      }
    }
  }, [componentKey, onToggleProcessed, isProcessed, haptic, onPress, component]);

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
          borderLeftWidth: isProcessed ? 4 : 0,
          borderLeftColor: isProcessed ? theme.bgButtonActive : 'transparent',
        },
      ]}
    >
      {/* Indicateur traité (icône X si traité) */}
      <View style={styles.processedIndicator}>
        <Text style={[styles.processedText, { 
          color: isProcessed ? theme.textPrimary : theme.textSecondary,
          opacity: isProcessed ? 1 : 0.3,
        }]}>
          {isProcessed ? '✓' : '○'}
        </Text>
      </View>

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
  processedIndicator: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  processedText: {
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
