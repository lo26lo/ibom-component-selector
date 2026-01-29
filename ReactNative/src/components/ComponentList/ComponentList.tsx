/**
 * ComponentList - Liste scrollable des composants
 */

import React, { useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme';
import { useAppStore, usePreferencesStore, useSessionStore } from '../../store';
import { ComponentRow } from './ComponentRow';
import { ListHeader } from './ListHeader';
import { FilterBar } from './FilterBar';
import { ProgressBar, ThemedButton } from '../common';
import { spacing, fontSize } from '../../theme/spacing';
import type { Component, ListFilters, GroupedComponent } from '../../core/types';

interface ComponentListProps {
  onComponentPress?: (component: Component) => void;
  onComponentLongPress?: (component: Component) => void;
}

export function ComponentList({
  onComponentPress,
  onComponentLongPress,
}: ComponentListProps) {
  const { theme } = useTheme();

  // Store
  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const filters = useAppStore((s) => s.filters);
  const processedItems = useAppStore((s) => s.processedItems);
  const setFilter = useAppStore((s) => s.setFilter);
  const toggleProcessed = useAppStore((s) => s.toggleProcessed);
  const navigateNext = useAppStore((s) => s.navigateNext);
  const navigatePrev = useAppStore((s) => s.navigatePrev);
  const clearProcessed = useAppStore((s) => s.clearProcessed);
  const markAllProcessed = useAppStore((s) => s.markAllProcessed);

  const prefFontSize = usePreferencesStore((s) => s.fontSize);
  const hideHiddenComponents = usePreferencesStore((s) => s.hideHiddenComponents);

  // Session store pour les états de colonnes
  const hiddenColumns = useSessionStore((s) => s.hiddenColumns);
  const clearHighlightedColumns = useSessionStore((s) => s.clearHighlightedColumns);

  // Filter and sort components
  const filteredComponents = useMemo(() => {
    let result = [...selectedComponents];

    // Debug: log pour le filtrage des masqués
    console.log('ComponentList filter:', {
      selectedCount: selectedComponents.length,
      hiddenColumnsCount: hiddenColumns.length,
      hiddenColumns: hiddenColumns.slice(0, 3),
    });

    // Toujours filtrer les composants masqués (ils disparaissent de la liste)
    if (hiddenColumns.length > 0) {
      result = result.filter((c) => {
        const key = `${c.value}|${c.footprint}|${c.lcsc}`;
        return !hiddenColumns.includes(key);
      });
      console.log('Après filtrage masqués:', result.length);
    }

    // Layer filter
    if (filters.layer !== 'all') {
      result = result.filter((c) => c.layer === filters.layer);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.ref.toLowerCase().includes(search) ||
          c.value?.toLowerCase().includes(search) ||
          c.footprint?.toLowerCase().includes(search) ||
          c.lcsc?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((c) => {
        const key = `${c.value}|${c.footprint}|${c.lcsc}`;
        const isProcessed = processedItems.has(key);
        return filters.status === 'done' ? isProcessed : !isProcessed;
      });
    }

    // Group by value if enabled
    if (filters.groupByValue) {
      const grouped = new Map<string, GroupedComponent>();
      
      for (const comp of result) {
        const key = `${comp.value}|${comp.footprint}|${comp.lcsc}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            ...comp,
            refs: [comp.ref],
            groupKey: key,
            qty: 1,
          });
        } else {
          const existing = grouped.get(key)!;
          existing.refs.push(comp.ref);
          existing.qty = existing.refs.length;
          existing.ref = existing.refs.join(', ');
        }
      }
      
      result = Array.from(grouped.values());
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (filters.sortColumn) {
        case 'qty':
          aVal = a.qty || 1;
          bVal = b.qty || 1;
          break;
        default:
          aVal = String(a[filters.sortColumn] || '').toLowerCase();
          bVal = String(b[filters.sortColumn] || '').toLowerCase();
      }

      if (aVal < bVal) return filters.sortReverse ? 1 : -1;
      if (aVal > bVal) return filters.sortReverse ? -1 : 1;
      return 0;
    });

    return result;
  }, [selectedComponents, filters, processedItems]);

  // Progress stats
  const progressStats = useMemo(() => {
    const total = filteredComponents.length;
    const done = filteredComponents.filter((c) => {
      const key = `${c.value}|${c.footprint}|${c.lcsc}`;
      return processedItems.has(key);
    }).length;
    return { total, done };
  }, [filteredComponents, processedItems]);

  // Handlers
  const handleSort = useCallback(
    (column: ListFilters['sortColumn']) => {
      if (filters.sortColumn === column) {
        setFilter('sortReverse', !filters.sortReverse);
      } else {
        setFilter('sortColumn', column);
        setFilter('sortReverse', false);
      }
    },
    [filters, setFilter]
  );

  const handleLayerChange = useCallback(
    (layer: ListFilters['layer']) => {
      setFilter('layer', layer);
    },
    [setFilter]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setFilter('search', text);
    },
    [setFilter]
  );

  const handleClearSearch = useCallback(() => {
    setFilter('search', '');
  }, [setFilter]);

  const handleToggleGroup = useCallback(() => {
    setFilter('groupByValue', !filters.groupByValue);
  }, [filters.groupByValue, setFilter]);

  const handleStatusChange = useCallback(() => {
    const statuses: ListFilters['status'][] = ['all', 'pending', 'done'];
    const currentIndex = statuses.indexOf(filters.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setFilter('status', statuses[nextIndex]);
  }, [filters.status, setFilter]);

  const renderItem = useCallback(
    ({ item }: { item: Component }) => {
      const key = `${item.value}|${item.footprint}|${item.lcsc}`;
      const isProcessed = processedItems.has(key);

      return (
        <ComponentRow
          component={item}
          isProcessed={isProcessed}
          onToggleProcessed={toggleProcessed}
          onPress={onComponentPress}
          onLongPress={onComponentLongPress}
          fontSizeMultiplier={prefFontSize / 11}
        />
      );
    },
    [processedItems, toggleProcessed, onComponentPress, onComponentLongPress, prefFontSize]
  );

  const keyExtractor = useCallback(
    (item: Component, index: number) => `${item.ref}-${index}`,
    []
  );

  const statusLabel = {
    all: 'Tous',
    pending: 'A faire',
    done: 'Faits',
  }[filters.status];

  // Handler pour effacer les highlights
  const handleClearHighlights = useCallback(() => {
    clearHighlightedColumns();
  }, [clearHighlightedColumns]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onLayerChange={handleLayerChange}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onToggleGroup={handleToggleGroup}
      />

      {/* Info bar */}
      <View style={[styles.infoBar, { backgroundColor: theme.bgSecondary }]}>
        <Text style={[styles.infoText, { color: theme.textPrimary }]}>
          Sel: {selectedComponents.length} | Masq: {hiddenColumns.length}
        </Text>
        <Text style={[styles.infoText, { color: theme.textPrimary }]}>
          Traités: {progressStats.done}/{progressStats.total}
        </Text>
        
        {/* Navigation buttons */}
        <ThemedButton title="<" onPress={navigatePrev} size="small" style={styles.navButton} />
        <ThemedButton title=">" onPress={navigateNext} size="small" style={styles.navButton} />
        <ThemedButton title="All" onPress={() => markAllProcessed(true)} size="small" style={styles.navButton} />
        <ThemedButton title="Clr" onPress={clearProcessed} size="small" style={styles.navButton} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.bgSecondary }]}>
        <ProgressBar current={progressStats.done} total={progressStats.total} />
        <ThemedButton
          title={statusLabel}
          onPress={handleStatusChange}
          size="small"
          style={styles.statusButton}
        />
        <ThemedButton
          title="✕HL"
          onPress={handleClearHighlights}
          size="small"
          style={styles.statusButton}
        />
      </View>

      {/* List header */}
      <ListHeader
        sortColumn={filters.sortColumn}
        sortReverse={filters.sortReverse}
        onSort={handleSort}
      />

      {/* Components list */}
      <FlatList
        data={filteredComponents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  navButton: {
    width: 35,
    height: 30,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  statusButton: {
    minWidth: 70,
    height: 25,
  },
  list: {
    flex: 1,
  },
});

export default ComponentList;
