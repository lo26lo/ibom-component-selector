/**
 * ListHeader - En-tête de la liste avec boutons de tri
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
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

  const renderColumn = (col: typeof columns[0]) => {
    const isActive = sortColumn === col.key;
    const indicator = isActive ? (sortReverse ? ' v' : ' ^') : '';

    return (
      <TouchableOpacity
        key={col.key}
        onPress={() => onSort(col.key)}
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
    width: 28 + spacing.sm,
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
