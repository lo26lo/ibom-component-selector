/**
 * ComponentRow - Ligne de composant avec gestes
 * 
 * SYSTÈME SIMPLIFIÉ: Un seul état par composant
 * - Swipe gauche = validated (vert)
 * - Swipe droite = hidden (gris)
 * - Double-tap = highlighted (rouge)
 */

import React, { useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  Swipeable,
  RectButton,
} from 'react-native-gesture-handler';
import { useTheme } from '../../theme';
import { useHaptic, useToastContext } from '../../hooks';
import { useSessionStore, type ComponentStatus } from '../../store';
import { spacing, fontSize, heights } from '../../theme/spacing';
import type { Component } from '../../core/types';

interface ComponentRowProps {
  component: Component;
  isProcessed: boolean;
  onToggleProcessed: (key: string) => void;
  onPress?: (component: Component) => void;
  onLongPress?: (component: Component) => void;
  onHide?: (groupKey: string) => void;
  onValidate?: (groupKey: string) => void;
  fontSizeMultiplier?: number;
}

export const ComponentRow = memo(function ComponentRow({
  component,
  isProcessed,
  onToggleProcessed,
  onPress,
  onLongPress,
  onHide,
  onValidate,
  fontSizeMultiplier = 1,
}: ComponentRowProps) {
  const { theme, isEinkMode } = useTheme();
  const haptic = useHaptic();
  const toast = useToastContext();
  const lastTapRef = useRef<number>(0);
  const swipeableRef = useRef<Swipeable>(null);

  const componentKey = `${component.value}|${component.footprint}|${component.lcsc}`;

  // Nouveau système unifié: un seul état par composant
  // IMPORTANT: On doit sélectionner directement depuis componentStatus pour que le composant se re-rende
  const componentStatus = useSessionStore((s) => s.componentStatus[componentKey] || null);
  const setComponentStatus = useSessionStore((s) => s.setComponentStatus);
  const toggleStatus = useSessionStore((s) => s.toggleStatus);

  // L'état visuel est directement le status (ou 'normal' si null)
  const visualState = componentStatus || 'normal';

  // Couleurs selon l'état
  const getBackgroundColor = () => {
    switch (visualState) {
      case 'highlighted':
        return theme.bgHighlighted;
      case 'validated':
        return theme.bgValidated;
      case 'hidden':
        return theme.bgHidden;
      case 'processed':
        return theme.bgProcessed;
      default:
        return theme.bgPrimary;
    }
  };

  const getTextColor = () => {
    switch (visualState) {
      case 'highlighted':
        return theme.textOnHighlighted;
      case 'validated':
        return theme.textOnValidated;
      case 'hidden':
        return theme.textOnHidden;
      default:
        return theme.textPrimary;
    }
  };

  const getBorderColor = () => {
    switch (visualState) {
      case 'highlighted':
        return theme.bgHighlighted;
      case 'validated':
        return theme.bgValidated;
      case 'hidden':
        return theme.bgHidden;
      case 'processed':
        return theme.bgButtonActive;
      default:
        return 'transparent';
    }
  };

  // Double-tap = surligner en rouge ce groupe (toggle)
  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double-tap détecté - toggle highlight
      toggleStatus(componentKey, 'highlighted');
      haptic.trigger('selection');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Simple tap - ne fait rien (évite conflit avec double-tap)
    }
  }, [componentKey, toggleStatus, haptic]);

  // Long press = afficher les détails du composant
  const handleLongPress = useCallback(() => {
    haptic.trigger('medium');
    if (onPress) {
      onPress(component);
    }
    if (onLongPress) {
      onLongPress(component);
    }
  }, [component, onPress, onLongPress, haptic]);

  // Swipe vers la droite = masquer (gris) - remplace tout autre état
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const isCurrentlyHidden = visualState === 'hidden';

    return (
      <RectButton
        style={[styles.swipeAction, { backgroundColor: theme.bgHidden }]}
        onPress={() => {
          haptic.trigger('medium');
          
          if (isCurrentlyHidden) {
            // Déjà masqué -> restaurer
            setComponentStatus(componentKey, null);
            toast.info(`${component.value || component.ref} restauré`);
          } else {
            // Masquer (remplace tout autre état)
            setComponentStatus(componentKey, 'hidden');
            toast.warning(`${component.value || component.ref} masqué`, () => {
              // Undo: restaurer
              setComponentStatus(componentKey, null);
            });
          }
          
          if (onHide) {
            onHide(componentKey);
          }
          swipeableRef.current?.close();
        }}
      >
        <Animated.Text
          style={[
            styles.swipeActionText,
            { color: theme.textOnHidden, transform: [{ scale }] },
          ]}
        >
          {isCurrentlyHidden ? 'Restaurer' : 'Masquer'}
        </Animated.Text>
      </RectButton>
    );
  };

  // Swipe vers la gauche = valider (vert) - remplace tout autre état
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const isCurrentlyValidated = visualState === 'validated';

    return (
      <RectButton
        style={[styles.swipeAction, { backgroundColor: theme.bgValidated }]}
        onPress={() => {
          haptic.trigger('medium');
          
          if (isCurrentlyValidated) {
            // Déjà validé -> restaurer
            setComponentStatus(componentKey, null);
            toast.info(`${component.value || component.ref} dévalidé`);
          } else {
            // Valider (remplace tout autre état)
            setComponentStatus(componentKey, 'validated');
            toast.success(`${component.value || component.ref} validé`, () => {
              // Undo: restaurer
              setComponentStatus(componentKey, null);
            });
          }
          
          if (onValidate) {
            onValidate(componentKey);
          }
          swipeableRef.current?.close();
        }}
      >
        <Animated.Text
          style={[
            styles.swipeActionText,
            { color: theme.textOnValidated, transform: [{ scale }] },
          ]}
        >
          {isCurrentlyValidated ? 'Dévalider' : 'Valider'}
        </Animated.Text>
      </RectButton>
    );
  };

  const fs = fontSize.sm * fontSizeMultiplier;
  const bgColor = getBackgroundColor();
  const textColor = getTextColor();
  const borderColor = getBorderColor();

  // Truncate ref if too long
  const refText = component.ref.length > 15
    ? component.ref.substring(0, 12) + '...'
    : component.ref;

  const showBorder = visualState !== 'normal';

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
    >
      <RectButton
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            borderBottomColor: theme.borderLight,
            // En mode e-ink, bordure plus épaisse pour meilleure visibilité
            borderLeftWidth: showBorder ? (isEinkMode ? 6 : 4) : 0,
            borderLeftColor: borderColor,
          },
        ]}
      >
        {/* Indicateur de statut - symboles plus distincts en e-ink */}
        <View style={styles.processedIndicator}>
          <Text style={[styles.processedText, { 
            color: textColor,
            opacity: visualState !== 'normal' ? 1 : 0.3,
            // Police plus grande en e-ink pour meilleure lisibilité
            fontSize: isEinkMode ? 16 : 14,
            fontWeight: isEinkMode ? 'bold' : 'normal',
          }]}>
            {visualState === 'validated' ? '✓' : 
             visualState === 'hidden' ? '▬' : 
             visualState === 'highlighted' ? '◆' : '○'}
          </Text>
        </View>

        {/* Ref */}
        <Text
          style={[styles.ref, { color: textColor, fontSize: fs }]}
          numberOfLines={1}
        >
          {refText}
        </Text>

        {/* Value */}
        <Text
          style={[styles.value, { color: textColor, fontSize: fs }]}
          numberOfLines={1}
        >
          {component.value?.substring(0, 10) || '-'}
        </Text>

        {/* Footprint */}
        <Text
          style={[styles.footprint, { color: visualState === 'normal' ? theme.textSecondary : textColor, fontSize: fs }]}
          numberOfLines={1}
        >
          {component.footprint?.substring(0, 12) || '-'}
        </Text>

        {/* LCSC */}
        <Text
          style={[styles.lcsc, { color: visualState === 'normal' ? theme.textSecondary : textColor, fontSize: fs }]}
          numberOfLines={1}
        >
          {component.lcsc || '-'}
        </Text>

        {/* Layer */}
        <Text
          style={[styles.layer, { color: textColor, fontSize: fs }]}
        >
          {component.layer}
        </Text>

        {/* Qty */}
        <Text
          style={[styles.qty, { color: textColor, fontSize: fs }]}
        >
          {component.qty || 1}
        </Text>
      </RectButton>
    </Swipeable>
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
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  processedText: {
    fontSize: fontSize.sm,
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
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  swipeActionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

export default ComponentRow;
