/**
 * HistoryModal - Modal d'historique des sélections
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';
import { useHistoryStore, useAppStore } from '../../store';
import { ThemedModal, ThemedButton } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { HistoryEntry } from '../../core/types';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  currentHtmlPath?: string | null;
}

export function HistoryModal({
  visible,
  onClose,
  currentHtmlPath,
}: HistoryModalProps) {
  const { theme, isEinkMode } = useTheme();

  const histories = useHistoryStore((s) => s.histories);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);
  const setCurrentIndex = useHistoryStore((s) => s.setCurrentIndex);
  const setCurrentHtmlPathStore = useHistoryStore((s) => s.setCurrentHtmlPath);

  const setSelectedComponents = useAppStore((s) => s.setSelectedComponents);

  // Récupérer l'historique pour le fichier courant
  const currentHistory = currentHtmlPath ? histories[currentHtmlPath] || [] : [];

  const handleRestore = useCallback(
    (entry: HistoryEntry, index: number) => {
      setSelectedComponents(entry.components);
      // Note: processedItems est géré dans le store principal
      if (currentHtmlPath) {
        setCurrentHtmlPathStore(currentHtmlPath);
        setCurrentIndex(index);
      }
      onClose();
    },
    [setSelectedComponents, setCurrentHtmlPathStore, setCurrentIndex, currentHtmlPath, onClose]
  );

  const handleDelete = useCallback(
    (index: number) => {
      if (currentHtmlPath) {
        setCurrentHtmlPathStore(currentHtmlPath);
        deleteEntry(index);
      }
    },
    [currentHtmlPath, setCurrentHtmlPathStore, deleteEntry]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HistoryEntry; index: number }) => {
      const processed = item.processedItems?.length || 0;
      const total = item.components?.length || 0;
      const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

      return (
        <View
          style={[
            styles.historyItem,
            {
              backgroundColor: isEinkMode ? '#ffffff' : theme.bgSecondary,
              borderColor: theme.borderLight,
            },
          ]}
        >
          <View style={styles.historyInfo}>
            <Text style={[styles.historyDate, { color: theme.textPrimary }]}>
              {item.date}
            </Text>
            <Text style={[styles.historyStats, { color: theme.textSecondary }]}>
              {item.name || 'Sans nom'} • {processed}/{total} ({progress}%)
            </Text>
          </View>

          <View style={styles.historyActions}>
            <ThemedButton
              title="Charger"
              onPress={() => handleRestore(item, index)}
              size="small"
              style={styles.actionButton}
            />
            <ThemedButton
              title="X"
              onPress={() => handleDelete(index)}
              size="small"
              style={styles.deleteButton}
            />
          </View>
        </View>
      );
    },
    [theme, isEinkMode, handleRestore, handleDelete]
  );

  const keyExtractor = useCallback(
    (item: HistoryEntry) => item.id,
    []
  );

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Historique">
      <View style={styles.content}>
        {currentHistory.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucune sauvegarde pour ce fichier.
          </Text>
        ) : (
          <FlatList
            data={currentHistory}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.md,
    maxHeight: 400,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  historyStats: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  historyActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
  },
  deleteButton: {
    width: 35,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    padding: spacing.lg,
  },
});

export default HistoryModal;
