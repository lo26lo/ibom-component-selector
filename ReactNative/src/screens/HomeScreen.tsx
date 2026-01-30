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
import { useTheme } from '../theme';
import { useAppStore, usePreferencesStore, useHistoryStore, useSessionStore } from '../store';
import { useHaptic, useToastContext, useFileSystem } from '../hooks';
import { PCBView, PCBColorFilter } from '../components/PCBView';
import { ComponentList } from '../components/ComponentList';
import { ThemedButton, ProgressBar } from '../components/common';
import {
  PreferencesModal,
  HistoryModal,
  SaveSelectionModal,
  ExportModal,
  ComponentDetailModal,
  FilePicker,
  HelpModal,
  HiddenColumnsModal,
} from '../components/Modals';
import { spacing } from '../theme/spacing';
import type { Component } from '../core/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function HomeScreen() {
  const { theme, isEinkMode } = useTheme();
  const haptic = useHaptic();
  const toast = useToastContext();

  // Stores
  const components = useAppStore((s) => s.components);
  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);
  const currentHtmlPath = useAppStore((s) => s.currentHtmlPath);
  const setCurrentHtmlPath = useAppStore((s) => s.setCurrentHtmlPath);
  const setSelectedComponents = useAppStore((s) => s.setSelectedComponents);
  const toggleProcessed = useAppStore((s) => s.toggleProcessed);

  const autoSave = usePreferencesStore((s) => s.autoSave);
  const autoSaveMinutes = usePreferencesStore((s) => s.autoSaveMinutes);

  const addHistory = useHistoryStore((s) => s.addHistory);

  // Session store pour persistance - nouveau système unifié
  const sessionHasHydrated = useSessionStore((s) => s._hasHydrated);
  const saveSession = useSessionStore((s) => s.saveSession);
  const restoreSession = useSessionStore((s) => s.restoreSession);
  const componentStatus = useSessionStore((s) => s.componentStatus);
  const setComponentStatus = useSessionStore((s) => s.setComponentStatus);
  const clearAllStatus = useSessionStore((s) => s.clearAllStatus);
  
  // Compter les états
  const hiddenCount = Object.values(componentStatus).filter(s => s === 'hidden').length;
  const validatedCount = Object.values(componentStatus).filter(s => s === 'validated').length;

  // View mode: 'split' | 'list' | 'pcb'
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'pcb'>('split');

  // Modal states
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHiddenColumns, setShowHiddenColumns] = useState(false);
  const [detailComponent, setDetailComponent] = useState<Component | null>(null);

  // Filtre de couleur pour le PCB
  const [pcbColorFilter, setPcbColorFilter] = useState<PCBColorFilter>('all');

  // Session restoration flag
  const [sessionRestored, setSessionRestored] = useState(false);

  // File system hook pour recharger le fichier
  const { loadHTMLFile } = useFileSystem();

  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Restaurer la session au démarrage
  useEffect(() => {
    const restoreAsync = async () => {
      if (sessionHasHydrated && !sessionRestored) {
        const session = restoreSession();
        if (session) {
          // Recharger le fichier HTML pour avoir le parser et les footprints
          // setParser auto-sélectionne tous les composants maintenant
          if (session.lastHtmlPath) {
            try {
              await loadHTMLFile(session.lastHtmlPath);
              setCurrentHtmlPath(session.lastHtmlPath);
              console.log('Fichier PCB rechargé:', session.lastHtmlPath);
              // Note: setParser() auto-sélectionne TOUS les composants du fichier
            } catch (e) {
              console.warn('Impossible de recharger le fichier PCB:', e);
            }
          }

          // Restaurer les processedItems
          session.processedItems.forEach((key) => {
            if (!processedItems.has(key)) {
              toggleProcessed(key);
            }
          });

          console.log('Session restaurée avec tous les composants du fichier');
        }
        setSessionRestored(true);
      }
    };
    restoreAsync();
  }, [sessionHasHydrated, sessionRestored, restoreSession, setCurrentHtmlPath, processedItems, toggleProcessed, loadHTMLFile]);

  // Sauvegarder la session à chaque changement
  useEffect(() => {
    if (sessionRestored && selectedComponents.length > 0) {
      saveSession({
        lastHtmlPath: currentHtmlPath,
        selectedComponents,
        processedItems: Array.from(processedItems),
      });
    }
  }, [sessionRestored, currentHtmlPath, selectedComponents, processedItems, saveSession]);

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

  const toggleView = useCallback(() => {
    const modes: Array<'split' | 'list' | 'pcb'> = ['split', 'list', 'pcb'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  }, [viewMode]);

  // Cycle le filtre de couleur du PCB
  const cycleColorFilter = useCallback(() => {
    const filters: PCBColorFilter[] = ['all', 'validated', 'hidden', 'highlighted', 'normal'];
    const currentIndex = filters.indexOf(pcbColorFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setPcbColorFilter(filters[nextIndex]);
    haptic.trigger('selection');
  }, [pcbColorFilter, haptic]);

  // Label pour le bouton de filtre de couleur
  const getColorFilterLabel = useCallback(() => {
    switch (pcbColorFilter) {
      case 'all': return '🎨';
      case 'validated': return '🟢';
      case 'hidden': return '🟡';
      case 'highlighted': return '🔵';
      case 'normal': return '⚪';
    }
  }, [pcbColorFilter]);

  // Style pour le bouton de filtre de couleur
  const getColorFilterStyle = useCallback(() => {
    switch (pcbColorFilter) {
      case 'validated': return { backgroundColor: theme.bgValidated };
      case 'hidden': return { backgroundColor: theme.bgHidden };
      case 'highlighted': return { backgroundColor: theme.bgHighlighted };
      default: return {};
    }
  }, [pcbColorFilter, theme]);

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
            title={`Masq (${hiddenCount})`}
            onPress={() => setShowHiddenColumns(true)}
            size="small"
            style={[styles.toolButton, hiddenCount > 0 && { backgroundColor: theme.bgHidden }]}
          />
          <ThemedButton
            title={getColorFilterLabel()}
            onPress={cycleColorFilter}
            size="small"
            style={[styles.toolButton, getColorFilterStyle()]}
          />
          <ThemedButton
            title={viewMode.toUpperCase()}
            onPress={toggleView}
            size="small"
            active
            style={styles.toolButton}
          />
          <ThemedButton
            title="?"
            onPress={() => setShowHelp(true)}
            size="small"
            style={styles.helpButton}
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
                onSelectionComplete={(selected) => {
                  setSelectedComponents(selected);
                  haptic.trigger('selection');
                }}
                colorFilter={pcbColorFilter}
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
        <HelpModal
          visible={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <HiddenColumnsModal
          visible={showHiddenColumns}
          onClose={() => setShowHiddenColumns(false)}
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
    minWidth: 50,
    height: 35,
  },
  helpButton: {
    width: 35,
    height: 35,
    minWidth: 35,
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
