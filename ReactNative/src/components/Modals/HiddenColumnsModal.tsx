/**
 * HiddenColumnsModal - Modal pour gérer les colonnes masquées
 */

import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useSessionStore, useAppStore } from '../../store';
import { useToastContext } from '../../hooks';
import { ThemedModal, ThemedButton } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface HiddenColumnsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface HiddenColumnInfo {
  groupKey: string;
  value: string;
  footprint: string;
  lcsc: string;
  count: number;
}

export function HiddenColumnsModal({
  visible,
  onClose,
}: HiddenColumnsModalProps) {
  const { theme, isEinkMode } = useTheme();
  const toast = useToastContext();

  // Nouveau système unifié
  const componentStatus = useSessionStore((s) => s.componentStatus);
  const setComponentStatus = useSessionStore((s) => s.setComponentStatus);
  const clearHidden = useSessionStore((s) => s.clearHidden);

  const selectedComponents = useAppStore((s) => s.selectedComponents);

  // Filtrer les groupKeys qui ont le statut 'hidden'
  const hiddenKeys = Object.entries(componentStatus)
    .filter(([_, status]) => status === 'hidden')
    .map(([key]) => key);

  // Construire les infos des colonnes masquées
  const hiddenColumnInfos: HiddenColumnInfo[] = hiddenKeys.map((groupKey) => {
    const parts = groupKey.split('|');
    const value = parts[0] || '-';
    const footprint = parts[1] || '-';
    const lcsc = parts[2] || '-';

    // Compter les composants dans ce groupe
    const count = selectedComponents.filter((c) => {
      const key = `${c.value}|${c.footprint}|${c.lcsc}`;
      return key === groupKey;
    }).length;

    return { groupKey, value, footprint, lcsc, count };
  });

  const handleShowColumn = useCallback(
    (groupKey: string, value: string) => {
      setComponentStatus(groupKey, null);  // Restaurer = supprimer le statut
      toast.info(`${value} restauré`, () => {
        // Undo: re-masquer
        setComponentStatus(groupKey, 'hidden');
      });
    },
    [setComponentStatus, toast]
  );

  const handleShowAll = useCallback(() => {
    const previousHidden = [...hiddenKeys];
    clearHidden();
    toast.info(`${previousHidden.length} groupe(s) restauré(s)`, () => {
      // Undo: re-masquer tous
      previousHidden.forEach((key) => setComponentStatus(key, 'hidden'));
    });
  }, [clearHidden, hiddenKeys, setComponentStatus, toast]);

  const renderItem = useCallback(
    ({ item }: { item: HiddenColumnInfo }) => {
      return (
        <View
          style={[
            styles.item,
            {
              backgroundColor: isEinkMode ? '#ffffff' : theme.bgSecondary,
              borderColor: theme.bgHidden,
            },
          ]}
        >
          <View style={styles.itemInfo}>
            <Text style={[styles.itemValue, { color: theme.textOnHidden }]}>
              {item.value}
            </Text>
            <Text style={[styles.itemFootprint, { color: theme.textSecondary }]}>
              {item.footprint}
            </Text>
            <Text style={[styles.itemLcsc, { color: theme.textSecondary }]}>
              LCSC: {item.lcsc} • {item.count} composant(s)
            </Text>
          </View>
          <ThemedButton
            title="Restaurer"
            onPress={() => handleShowColumn(item.groupKey, item.value)}
            size="small"
            style={styles.restoreButton}
          />
        </View>
      );
    },
    [theme, isEinkMode, handleShowColumn]
  );

  const keyExtractor = useCallback(
    (item: HiddenColumnInfo) => item.groupKey,
    []
  );

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Colonnes masquées">
      {hiddenColumnInfos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucune colonne masquée.
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            Faites glisser vers la droite sur une ligne de composant pour masquer
            tous les composants de cette valeur.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: theme.textPrimary }]}>
              {hiddenColumnInfos.length} groupe(s) masqué(s)
            </Text>
            <ThemedButton
              title="Tout restaurer"
              onPress={handleShowAll}
              size="small"
            />
          </View>

          <FlatList
            data={hiddenColumnInfos}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
          />
        </>
      )}
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  list: {
    maxHeight: 350,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderLeftWidth: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  itemFootprint: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  itemLcsc: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  restoreButton: {
    paddingHorizontal: spacing.md,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default HiddenColumnsModal;
