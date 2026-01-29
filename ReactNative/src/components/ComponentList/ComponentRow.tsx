/**
 * ComponentRow - Ligne de composant avec double-tap pour marquer traité
 * Supporte les états: validé (vert), masqué (jaune), surligné (bleu)
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
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useTheme } from '../../theme';
import { useHaptic, useToastContext } from '../../hooks';
import { useSessionStore } from '../../store';
import { spacing, fontSize, heights } from '../../theme/spacing';
import type { Component } from '../../core/types';

// Type d'état visuel du composant
type ComponentVisualState = 'normal' | 'processed' | 'validated' | 'hidden' | 'highlighted';

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

  // États depuis le store de session
  const isColumnValidated = useSessionStore((s) => s.isColumnValidated(componentKey));
  const isColumnHidden = useSessionStore((s) => s.isColumnHidden(componentKey));
  const isColumnHighlighted = useSessionStore((s) => s.isColumnHighlighted(componentKey));
  const hideColumn = useSessionStore((s) => s.hideColumn);
  const showColumn = useSessionStore((s) => s.showColumn);
  const toggleColumnValidated = useSessionStore((s) => s.toggleColumnValidated);

  // Déterminer l'état visuel prioritaire
  const getVisualState = (): ComponentVisualState => {
    if (isColumnHighlighted) return 'highlighted';
    if (isColumnValidated) return 'validated';
    if (isColumnHidden) return 'hidden';
    if (isProcessed) return 'processed';
    return 'normal';
  };

  const visualState = getVisualState();

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

  // Session store pour highlight
  const toggleHighlightColumn = useSessionStore((s) => s.toggleHighlightColumn);

  // Simple tap = afficher détails, Double-tap = surligner en bleu ce groupe
  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double-tap détecté - surligner ce groupe en bleu
      toggleHighlightColumn(componentKey);
      haptic.trigger('selection');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (onPress) {
        onPress(component);
      }
    }
  }, [componentKey, toggleHighlightColumn, haptic, onPress, component]);

  // Long press = valider la colonne (vert) + toggle processed
  const handleLongPress = useCallback(() => {
    haptic.trigger('medium');
    // Toggle l'état traité
    onToggleProcessed(componentKey);
    if (onLongPress) {
      onLongPress(component);
    }
  }, [component, componentKey, onToggleProcessed, onLongPress, haptic]);

  // Swipe vers la droite = masquer la colonne (jaune)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <RectButton
        style={[styles.swipeAction, { backgroundColor: theme.bgHidden }]}
        onPress={() => {
          haptic.trigger('medium');
          hideColumn(componentKey);
          
          // Toast avec undo
          toast.warning(`${component.value || component.ref} masqué`, () => {
            // Undo: réafficher la colonne
            showColumn(componentKey);
          });
          
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
          Masquer
        </Animated.Text>
      </RectButton>
    );
  };

  // Swipe vers la gauche = valider la colonne (vert)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const willValidate = !isColumnValidated;

    return (
      <RectButton
        style={[styles.swipeAction, { backgroundColor: theme.bgValidated }]}
        onPress={() => {
          haptic.trigger('medium');
          toggleColumnValidated(componentKey);
          
          // Toast avec undo
          if (willValidate) {
            toast.success(`${component.value || component.ref} validé`, () => {
              // Undo: dévalider
              toggleColumnValidated(componentKey);
            });
          } else {
            toast.info(`${component.value || component.ref} dévalidé`);
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
          {isColumnValidated ? 'Dévalider' : 'Valider'}
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
            borderLeftWidth: showBorder ? 4 : 0,
            borderLeftColor: borderColor,
          },
        ]}
      >
        {/* Indicateur traité (icône si traité/validé) */}
        <View style={styles.processedIndicator}>
          <Text style={[styles.processedText, { 
            color: textColor,
            opacity: isProcessed || isColumnValidated ? 1 : 0.3,
          }]}>
            {isColumnValidated ? '✓✓' : isProcessed ? '✓' : '○'}
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
