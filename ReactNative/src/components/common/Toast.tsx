/**
 * Toast - Notifications temporaires avec support Undo
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  undoAction?: () => void;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  const duration = toast.duration || 3000;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  const handleUndo = () => {
    if (toast.undoAction) {
      toast.undoAction();
    }
    handleDismiss();
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return theme.bgValidated;
      case 'warning':
        return theme.bgHidden;
      case 'error':
        return '#cc3333';
      default:
        return theme.bgHighlighted;
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return theme.textOnValidated;
      case 'warning':
        return theme.textOnHidden;
      case 'error':
        return '#ffffff';
      default:
        return theme.textOnHighlighted;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.message, { color: getTextColor() }]}>
        {toast.message}
      </Text>
      
      {toast.undoAction && (
        <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
          <Text style={[styles.undoText, { color: getTextColor() }]}>
            ANNULER
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
        <Text style={[styles.dismissText, { color: getTextColor() }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Container pour gérer plusieurs toasts
interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  undoButton: {
    marginLeft: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: borderRadius.sm,
  },
  undoText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default Toast;
