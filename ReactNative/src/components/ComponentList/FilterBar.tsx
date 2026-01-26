/**
 * FilterBar - Barre de filtres et recherche
 */

import React, { memo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { ThemedButton } from '../common';
import { spacing, fontSize, heights, borderRadius } from '../../theme/spacing';
import type { ListFilters } from '../../core/types';

interface FilterBarProps {
  filters: ListFilters;
  onLayerChange: (layer: ListFilters['layer']) => void;
  onSearchChange: (text: string) => void;
  onClearSearch: () => void;
  onToggleGroup: () => void;
}

export const FilterBar = memo(function FilterBar({
  filters,
  onLayerChange,
  onSearchChange,
  onClearSearch,
  onToggleGroup,
}: FilterBarProps) {
  const { theme, isEinkMode } = useTheme();

  const layers: Array<{ key: ListFilters['layer']; label: string }> = [
    { key: 'all', label: 'Tous' },
    { key: 'F', label: 'Front' },
    { key: 'B', label: 'Back' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Layer filter */}
      <View style={styles.layerButtons}>
        {layers.map((layer) => (
          <ThemedButton
            key={layer.key}
            title={layer.label}
            onPress={() => onLayerChange(layer.key)}
            active={filters.layer === layer.key}
            size="small"
            style={styles.layerButton}
          />
        ))}
      </View>

      {/* Search input */}
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: isEinkMode ? '#ffffff' : theme.bgPrimary,
            color: isEinkMode ? '#000000' : theme.textPrimary,
            borderColor: isEinkMode ? theme.border : 'transparent',
            borderWidth: isEinkMode ? 1 : 0,
          },
        ]}
        value={filters.search}
        onChangeText={onSearchChange}
        placeholder="Rechercher..."
        placeholderTextColor={theme.textSecondary}
      />

      {/* Clear search */}
      <ThemedButton
        title="X"
        onPress={onClearSearch}
        size="small"
        style={styles.clearButton}
      />

      {/* Group toggle */}
      <ThemedButton
        title="Grp"
        onPress={onToggleGroup}
        active={filters.groupByValue}
        size="small"
        style={styles.groupButton}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: heights.row,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  layerButtons: {
    flexDirection: 'row',
    gap: 2,
  },
  layerButton: {
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: heights.row - 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.sm,
  },
  clearButton: {
    width: 35,
  },
  groupButton: {
    width: 45,
  },
});

export default FilterBar;
