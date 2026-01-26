/**
 * ThemedButton - Bouton avec thème e-ink/normal
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { heights, fontSize as fontSizes, borderRadius } from '../../theme/spacing';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ThemedButton({
  title,
  onPress,
  disabled = false,
  active = false,
  size = 'medium',
  style,
  textStyle,
}: ThemedButtonProps) {
  const { theme, isEinkMode } = useTheme();

  const buttonHeight = {
    small: 35,
    medium: heights.button,
    large: 55,
  }[size];

  const buttonFontSize = {
    small: fontSizes.xs,
    medium: fontSizes.md,
    large: fontSizes.lg,
  }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: active ? theme.bgButtonActive : theme.bgButton,
          height: buttonHeight,
          borderColor: isEinkMode ? theme.border : 'transparent',
          borderWidth: isEinkMode ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.textPrimary,
            fontSize: buttonFontSize,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  text: {
    fontWeight: '500',
  },
});

export default ThemedButton;
