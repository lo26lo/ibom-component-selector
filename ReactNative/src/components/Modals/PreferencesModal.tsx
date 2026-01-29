/**
 * PreferencesModal - Modal de configuration des préférences
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { usePreferencesStore } from '../../store';
import { ThemedModal, ThemedButton, ThemedToggle } from '../common';
import { spacing, fontSize } from '../../theme/spacing';

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PreferencesModal({ visible, onClose }: PreferencesModalProps) {
  const { theme, isEinkMode } = useTheme();

  const {
    einkMode,
    setEinkMode,
    autoSave,
    setAutoSave,
    autoSaveMinutes,
    setAutoSaveMinutes,
    vibrationEnabled,
    setVibrationEnabled,
    fontSize: prefFontSize,
    setFontSize,
    groupByValue,
    setGroupByValue,
    showSilkscreen,
    setShowSilkscreen,
    hideHiddenComponents,
    setHideHiddenComponents,
    resetPreferences,
  } = usePreferencesStore();

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
        {/* Mode E-ink */}
        <ThemedToggle 
          label="Mode E-ink"
          value={einkMode} 
          onValueChange={setEinkMode} 
        />

        {/* Vibration */}
        <ThemedToggle 
          label="Vibration"
          value={vibrationEnabled} 
          onValueChange={setVibrationEnabled} 
        />

        {/* Auto-save */}
        <ThemedToggle 
          label="Sauvegarde auto"
          value={autoSave} 
          onValueChange={setAutoSave} 
        />

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

        {/* Group by value */}
        <ThemedToggle 
          label="Grouper par valeur"
          value={groupByValue} 
          onValueChange={setGroupByValue} 
        />

        {/* Silkscreen */}
        <ThemedToggle 
          label="Afficher silkscreen (texte PCB)"
          value={showSilkscreen} 
          onValueChange={setShowSilkscreen} 
        />

        {/* Cacher les composants masqués */}
        <ThemedToggle 
          label="Cacher composants masqués"
          value={hideHiddenComponents} 
          onValueChange={setHideHiddenComponents} 
        />

        {/* Reset button */}
        <View style={styles.resetRow}>
          <ThemedButton
            title="Réinitialiser"
            onPress={resetPreferences}
            style={styles.resetButton}
          />
        </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  resetButton: {
    width: '100%',
  },
});

export default PreferencesModal;
