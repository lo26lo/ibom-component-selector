/**
 * ListHeader - En-tête de la liste avec boutons de tri
 * Double-tap sur une colonne = surligner les composants (bleu)
 * Long-press sur une colonne = valider les composants (vert)
 */

import React, { memo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useHaptic } from '../../hooks';
import { useSessionStore, useAppStore } from '../../store';
import { spacing, fontSize, heights } from '../../theme/spacing';
import type { ListFilters } from '../../core/types';

interface ListHeaderProps {
  sortColumn: ListFilters['sortColumn'];
  sortReverse: boolean;
  onSort: (column: ListFilters['sortColumn']) => void;
}

export const ListHeader = memo(function ListHeader({
  sortColumn,
  sortReverse,
  onSort,
}: ListHeaderProps) {
  const { theme, isEinkMode } = useTheme();
  const haptic = useHaptic();

  // Refs pour détecter les double-taps par colonne
  const lastTapRefs = useRef<{ [key: string]: number }>({});

  // Store session pour highlight
  const toggleHighlightColumn = useSessionStore((s) => s.toggleHighlightColumn);
  const highlightedColumns = useSessionStore((s) => s.highlightedColumns);
  const selectedComponents = useAppStore((s) => s.selectedComponents);

  const columns: Array<{
    key: ListFilters['sortColumn'];
    label: string;
    flex: number;
  }> = [
    { key: 'ref', label: 'Ref', flex: 0.12 },
    { key: 'value', label: 'Valeur', flex: 0.2 },
    { key: 'footprint', label: 'Footprint', flex: 0.25 },
    { key: 'lcsc', label: 'LCSC', flex: 0.2 },
    { key: 'layer', label: 'L', flex: 0.08 },
    { key: 'qty', label: 'Qt', flex: 0.07 },
  ];

  // Gérer le tap sur une colonne (tri ou double-tap pour highlight)
  const handleColumnPress = useCallback(
    (column: ListFilters['sortColumn']) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      const lastTap = lastTapRefs.current[column] || 0;

      if (now - lastTap < DOUBLE_TAP_DELAY) {
        // Double-tap détecté - surligner tous les composants avec cette colonne comme tri
        // Pour la colonne "value", on highlight par groupKey
        if (column === 'value') {
          // Obtenir tous les groupKeys uniques
          const uniqueGroupKeys = new Set<string>();
          selectedComponents.forEach((c) => {
            const key = `${c.value}|${c.footprint}|${c.lcsc}`;
            uniqueGroupKeys.add(key);
          });
          // Toggle tous les highlights
          uniqueGroupKeys.forEach((key) => {
            toggleHighlightColumn(key);
          });
          haptic.trigger('selection');
        }
        lastTapRefs.current[column] = 0;
      } else {
        // Premier tap - tri normal
        lastTapRefs.current[column] = now;
        onSort(column);
      }
    },
    [onSort, selectedComponents, toggleHighlightColumn, haptic]
  );

  const renderColumn = (col: typeof columns[0]) => {
    const isActive = sortColumn === col.key;
    const indicator = isActive ? (sortReverse ? ' ▼' : ' ▲') : '';

    return (
      <TouchableOpacity
        key={col.key}
        onPress={() => handleColumnPress(col.key)}
        style={[
          styles.column,
          {
            flex: col.flex,
            backgroundColor: isActive ? theme.bgButtonActive : theme.bgButton,
            borderColor: isEinkMode ? theme.border : 'transparent',
            borderWidth: isEinkMode ? 1 : 0,
          },
        ]}
      >
        <Text
          style={[styles.columnText, { color: theme.textPrimary }]}
          numberOfLines={1}
        >
          {col.label}{indicator}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Ok column placeholder */}
      <View style={styles.checkboxPlaceholder}>
        <Text style={[styles.columnText, { color: theme.textPrimary }]}>
          Ok
        </Text>
      </View>
      
      {columns.map(renderColumn)}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: heights.header,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  checkboxPlaceholder: {
    width: 32 + spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  column: {
    height: heights.header - 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  columnText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});

export default ListHeader;
