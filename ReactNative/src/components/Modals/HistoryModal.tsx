/**
 * HistoryModal - Modal d'historique des sélections
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
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
  currentHtmlPath?: string;
}

export function HistoryModal({
  visible,
  onClose,
  currentHtmlPath,
}: HistoryModalProps) {
  const { theme, isEinkMode } = useTheme();

  const history = useHistoryStore((s) => s.history);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);

  const setSelectedComponents = useAppStore((s) => s.setSelectedComponents);
  const setProcessedItems = useAppStore((s) => s.setProcessedItems);

  const currentHistory = currentHtmlPath ? history[currentHtmlPath] || [] : [];

  const handleRestore = useCallback(
    (entry: HistoryEntry) => {
      setSelectedComponents(entry.selectedComponents);
      setProcessedItems(new Set(entry.processedItems));
      onClose();
    },
    [setSelectedComponents, setProcessedItems, onClose]
  );

  const handleDelete = useCallback(
    (timestamp: number) => {
      if (currentHtmlPath) {
        deleteEntry(currentHtmlPath, timestamp);
      }
    },
    [currentHtmlPath, deleteEntry]
  );

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: HistoryEntry }) => {
      const processed = item.processedItems.length;
      const total = item.selectedComponents.length;
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
              {formatDate(item.timestamp)}
            </Text>
            <Text style={[styles.historyStats, { color: theme.textSecondary }]}>
              {item.name || 'Sans nom'} • {processed}/{total} ({progress}%)
            </Text>
          </View>

          <View style={styles.historyActions}>
            <ThemedButton
              title="Charger"
              onPress={() => handleRestore(item)}
              size="small"
              style={styles.actionButton}
            />
            <ThemedButton
              title="X"
              onPress={() => handleDelete(item.timestamp)}
              size="small"
              style={styles.deleteButton}
            />
          </View>
        </View>
      );
    },
    [theme, isEinkMode, formatDate, handleRestore, handleDelete]
  );

  const keyExtractor = useCallback(
    (item: HistoryEntry) => item.timestamp.toString(),
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
