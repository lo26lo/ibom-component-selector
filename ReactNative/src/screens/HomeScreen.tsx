/**
 * HomeScreen - Écran principal de l'application
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../theme';
import { useAppStore, usePreferencesStore, useHistoryStore } from '../../store';
import { useHaptic } from '../../hooks';
import { PCBView } from '../PCBView';
import { ComponentList } from '../ComponentList';
import { ThemedButton, ProgressBar } from '../common';
import {
  PreferencesModal,
  HistoryModal,
  SaveSelectionModal,
  ExportModal,
  ComponentDetailModal,
  FilePicker,
} from '../Modals';
import { spacing } from '../../theme/spacing';
import type { Component } from '../../core/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function HomeScreen() {
  const { theme, isEinkMode } = useTheme();
  const haptic = useHaptic();

  // Stores
  const pcbData = useAppStore((s) => s.pcbData);
  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);
  const currentHtmlPath = useAppStore((s) => s.currentHtmlPath);
  const setPcbData = useAppStore((s) => s.setPcbData);
  const setCurrentHtmlPath = useAppStore((s) => s.setCurrentHtmlPath);
  const setSelectedComponents = useAppStore((s) => s.setSelectedComponents);
  const toggleProcessed = useAppStore((s) => s.toggleProcessed);

  const autoSave = usePreferencesStore((s) => s.autoSave);
  const autoSaveMinutes = usePreferencesStore((s) => s.autoSaveMinutes);

  const addHistory = useHistoryStore((s) => s.addHistory);

  // View mode: 'split' | 'list' | 'pcb'
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'pcb'>('split');

  // Modal states
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailComponent, setDetailComponent] = useState<Component | null>(null);

  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoSave && currentHtmlPath && selectedComponents.length > 0) {
      autoSaveTimer.current = setInterval(() => {
        const entry = {
          timestamp: Date.now(),
          name: `Auto-save`,
          selectedComponents,
          processedItems: Array.from(processedItems),
        };
        addHistory(currentHtmlPath, entry);
      }, autoSaveMinutes * 60 * 1000);

      return () => {
        if (autoSaveTimer.current) {
          clearInterval(autoSaveTimer.current);
        }
      };
    }
  }, [autoSave, autoSaveMinutes, currentHtmlPath, selectedComponents, processedItems, addHistory]);

  // Handlers
  const handleFilesLoaded = useCallback(
    (htmlPath: string, csvPath?: string) => {
      setCurrentHtmlPath(htmlPath);
      // PCB data will be set by the file loading hook
    },
    [setCurrentHtmlPath]
  );

  const handleComponentPress = useCallback((component: Component) => {
    setDetailComponent(component);
    setShowDetail(true);
  }, []);

  const handleComponentLongPress = useCallback(
    (component: Component) => {
      const key = `${component.value}|${component.footprint}|${component.lcsc}`;
      toggleProcessed(key);
      haptic.trigger('medium');
    },
    [toggleProcessed, haptic]
  );

  const handlePCBSelection = useCallback(
    (refs: string[]) => {
      if (!pcbData) return;

      const selected = pcbData.components.filter((c) =>
        refs.includes(c.ref)
      );
      setSelectedComponents(selected);
      haptic.trigger('selection');
    },
    [pcbData, setSelectedComponents, haptic]
  );

  const toggleView = useCallback(() => {
    const modes: Array<'split' | 'list' | 'pcb'> = ['split', 'list', 'pcb'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  }, [viewMode]);

  // Progress stats
  const totalCount = selectedComponents.length;
  const processedCount = selectedComponents.filter((c) => {
    const key = `${c.value}|${c.footprint}|${c.lcsc}`;
    return processedItems.has(key);
  }).length;

  // Check if component is processed
  const isComponentProcessed = useCallback(
    (component: Component | null) => {
      if (!component) return false;
      const key = `${component.value}|${component.footprint}|${component.lcsc}`;
      return processedItems.has(key);
    },
    [processedItems]
  );

  const showPCB = viewMode === 'split' || viewMode === 'pcb';
  const showList = viewMode === 'split' || viewMode === 'list';

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      >
        <StatusBar
          barStyle={isEinkMode ? 'dark-content' : 'light-content'}
          backgroundColor={theme.bgPrimary}
        />

        {/* Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: theme.bgSecondary }]}>
          <ThemedButton
            title="Fichier"
            onPress={() => setShowFilePicker(true)}
            size="small"
            style={styles.toolButton}
          />
          <ThemedButton
            title="Préf"
            onPress={() => setShowPreferences(true)}
            size="small"
            style={styles.toolButton}
          />
          <ThemedButton
            title="Hist"
            onPress={() => setShowHistory(true)}
            size="small"
            style={styles.toolButton}
          />
          <ThemedButton
            title="Save"
            onPress={() => setShowSave(true)}
            size="small"
            style={styles.toolButton}
          />
          <ThemedButton
            title="Export"
            onPress={() => setShowExport(true)}
            size="small"
            style={styles.toolButton}
          />
          <ThemedButton
            title={viewMode.toUpperCase()}
            onPress={toggleView}
            size="small"
            active
            style={styles.toolButton}
          />
        </View>

        {/* Progress bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.bgSecondary }]}>
          <ProgressBar current={processedCount} total={totalCount} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* PCB View */}
          {showPCB && (
            <View
              style={[
                styles.pcbContainer,
                viewMode === 'split' && styles.halfHeight,
              ]}
            >
              <PCBView
                pcbData={pcbData}
                selectedComponents={selectedComponents}
                processedItems={processedItems}
                onSelectionChange={handlePCBSelection}
              />
            </View>
          )}

          {/* Component List */}
          {showList && (
            <View
              style={[
                styles.listContainer,
                viewMode === 'split' && styles.halfHeight,
              ]}
            >
              <ComponentList
                onComponentPress={handleComponentPress}
                onComponentLongPress={handleComponentLongPress}
              />
            </View>
          )}
        </View>

        {/* Modals */}
        <FilePicker
          visible={showFilePicker}
          onClose={() => setShowFilePicker(false)}
          onFilesLoaded={handleFilesLoaded}
        />
        <PreferencesModal
          visible={showPreferences}
          onClose={() => setShowPreferences(false)}
        />
        <HistoryModal
          visible={showHistory}
          onClose={() => setShowHistory(false)}
          currentHtmlPath={currentHtmlPath}
        />
        <SaveSelectionModal
          visible={showSave}
          onClose={() => setShowSave(false)}
          currentHtmlPath={currentHtmlPath}
        />
        <ExportModal
          visible={showExport}
          onClose={() => setShowExport(false)}
        />
        <ComponentDetailModal
          visible={showDetail}
          onClose={() => setShowDetail(false)}
          component={detailComponent}
          isProcessed={isComponentProcessed(detailComponent)}
          onToggleProcessed={toggleProcessed}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  toolButton: {
    flex: 1,
    minWidth: 55,
    height: 35,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  pcbContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  halfHeight: {
    flex: 0.5,
  },
});

export default HomeScreen;
