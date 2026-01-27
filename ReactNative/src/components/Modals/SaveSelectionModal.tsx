/**
 * SaveSelectionModal - Modal pour sauvegarder la sélection
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useHistoryStore, useAppStore } from '../../store';
import { ThemedModal, ThemedButton } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface SaveSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentHtmlPath?: string;
}

export function SaveSelectionModal({
  visible,
  onClose,
  currentHtmlPath,
}: SaveSelectionModalProps) {
  const { theme, isEinkMode } = useTheme();

  const [name, setName] = useState('');

  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);
  const addHistory = useHistoryStore((s) => s.addHistory);

  const handleSave = useCallback(() => {
    if (!currentHtmlPath) return;

    const entry = {
      timestamp: Date.now(),
      name: name.trim() || `Sauvegarde ${new Date().toLocaleString('fr-FR')}`,
      selectedComponents,
      processedItems: Array.from(processedItems),
    };

    addHistory(currentHtmlPath, entry);
    setName('');
    onClose();
  }, [currentHtmlPath, name, selectedComponents, processedItems, addHistory, onClose]);

  const processedCount = processedItems.size;
  const totalCount = selectedComponents.length;

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Sauvegarder">
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {processedCount}/{totalCount} composants traités
        </Text>

        <Text style={[styles.label, { color: theme.textPrimary }]}>
          Nom de la sauvegarde (optionnel):
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isEinkMode ? '#ffffff' : theme.bgSecondary,
              color: isEinkMode ? '#000000' : theme.textPrimary,
              borderColor: theme.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Ma sauvegarde..."
          placeholderTextColor={theme.textSecondary}
        />

        <View style={styles.buttons}>
          <ThemedButton
            title="Annuler"
            onPress={onClose}
            style={styles.button}
          />
          <ThemedButton
            title="Sauvegarder"
            onPress={handleSave}
            active
            style={styles.button}
          />
        </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  statsText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  input: {
    height: 45,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});

export default SaveSelectionModal;
