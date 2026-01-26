/**
 * PreferencesModal - Modal de configuration des préférences
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../theme';
import { usePreferencesStore } from '../../store';
import { ThemedModal, ThemedButton, ThemedToggle } from '../common';
import { spacing, fontSize } from '../../theme/spacing';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PreferencesModal({ visible, onClose }: PreferencesModalProps) {
  const { theme, isEinkMode, toggleEinkMode } = useTheme();

  const preferences = usePreferencesStore();
  const {
    autoSave,
    setAutoSave,
    autoSaveMinutes,
    setAutoSaveMinutes,
    vibration,
    setVibration,
    fontSize: prefFontSize,
    setFontSize,
    showHidden,
    setShowHidden,
    resetPreferences,
  } = preferences;

  const fontSizes = [10, 11, 12, 13, 14, 15];
  const autoSaveOptions = [5, 10, 15, 30];

  const handleFontSizeChange = useCallback(() => {
    const currentIndex = fontSizes.indexOf(prefFontSize);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    setFontSize(fontSizes[nextIndex]);
  }, [prefFontSize, setFontSize]);

  const handleAutoSaveMinutesChange = useCallback(() => {
    const currentIndex = autoSaveOptions.indexOf(autoSaveMinutes);
    const nextIndex = (currentIndex + 1) % autoSaveOptions.length;
    setAutoSaveMinutes(autoSaveOptions[nextIndex]);
  }, [autoSaveMinutes, setAutoSaveMinutes]);

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Préférences">
      <View style={styles.content}>
        {/* Mode E-ink */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Mode E-ink
          </Text>
          <ThemedToggle value={isEinkMode} onValueChange={toggleEinkMode} />
        </View>

        {/* Vibration */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Vibration
          </Text>
          <ThemedToggle value={vibration} onValueChange={setVibration} />
        </View>

        {/* Auto-save */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Sauvegarde auto
          </Text>
          <ThemedToggle value={autoSave} onValueChange={setAutoSave} />
        </View>

        {/* Auto-save interval */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Intervalle (min)
          </Text>
          <ThemedButton
            title={`${autoSaveMinutes}`}
            onPress={handleAutoSaveMinutesChange}
            size="small"
            style={styles.valueButton}
          />
        </View>

        {/* Font size */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Taille police
          </Text>
          <ThemedButton
            title={`${prefFontSize}`}
            onPress={handleFontSizeChange}
            size="small"
            style={styles.valueButton}
          />
        </View>

        {/* Show hidden */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Afficher cachés
          </Text>
          <ThemedToggle value={showHidden} onValueChange={setShowHidden} />
        </View>

        {/* Reset button */}
        <View style={styles.resetRow}>
          <ThemedButton
            title="Réinitialiser"
            onPress={resetPreferences}
            style={styles.resetButton}
          />
        </View>
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    flex: 1,
  },
  valueButton: {
    minWidth: 60,
  },
  resetRow: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  resetButton: {
    width: '100%',
  },
});

export default PreferencesModal;
