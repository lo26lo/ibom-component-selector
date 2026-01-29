/**
 * Store de session - Persistance de l'état de travail actuel
 * Permet de restaurer automatiquement la dernière session au démarrage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Component } from '../core/types';

// État de session sauvegardé
export interface SessionState {
  // Fichiers chargés
  lastHtmlPath: string | null;
  lastLcscPath: string | null;

  // Composants sélectionnés
  selectedComponents: Component[];

  // Composants traités (validés)
  processedItems: string[];

  // Colonnes validées (groupKeys)
  validatedColumns: string[];

  // Colonnes masquées (groupKeys)
  hiddenColumns: string[];

  // Colonnes surlignées (pour double-tap, non persisté)
  highlightedColumns: string[];

  // Timestamp de dernière modification
  lastModified: number;
}

interface SessionStoreState extends SessionState {
  // Hydration status
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Actions pour sauvegarder la session
  saveSession: (data: Partial<SessionState>) => void;

  // Actions pour les fichiers
  setLastPaths: (htmlPath: string | null, lcscPath: string | null) => void;

  // Actions pour les colonnes validées
  toggleColumnValidated: (groupKey: string) => void;
  isColumnValidated: (groupKey: string) => boolean;
  clearValidatedColumns: () => void;

  // Actions pour les colonnes masquées
  hideColumn: (groupKey: string) => void;
  showColumn: (groupKey: string) => void;
  isColumnHidden: (groupKey: string) => boolean;
  getHiddenColumns: () => string[];
  clearHiddenColumns: () => void;

  // Actions pour le highlight (double-tap)
  setHighlightedColumns: (groupKeys: string[]) => void;
  toggleHighlightColumn: (groupKey: string) => void;
  isColumnHighlighted: (groupKey: string) => boolean;
  clearHighlightedColumns: () => void;

  // Action pour restaurer une session
  restoreSession: () => SessionState | null;

  // Action pour effacer la session
  clearSession: () => void;
}

const defaultSession: SessionState = {
  lastHtmlPath: null,
  lastLcscPath: null,
  selectedComponents: [],
  processedItems: [],
  validatedColumns: [],
  hiddenColumns: [],
  highlightedColumns: [],
  lastModified: 0,
};

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      ...defaultSession,

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      saveSession: (data) => {
        set({
          ...data,
          lastModified: Date.now(),
        });
      },

      setLastPaths: (htmlPath, lcscPath) => {
        set({
          lastHtmlPath: htmlPath,
          lastLcscPath: lcscPath,
          lastModified: Date.now(),
        });
      },

      // Colonnes validées
      toggleColumnValidated: (groupKey) => {
        const current = get().validatedColumns;
        const isValidated = current.includes(groupKey);
        const newValidated = isValidated
          ? current.filter((k) => k !== groupKey)
          : [...current, groupKey];
        set({ validatedColumns: newValidated, lastModified: Date.now() });
      },

      isColumnValidated: (groupKey) => {
        return get().validatedColumns.includes(groupKey);
      },

      clearValidatedColumns: () => {
        set({ validatedColumns: [], lastModified: Date.now() });
      },

      // Colonnes masquées
      hideColumn: (groupKey) => {
        const current = get().hiddenColumns;
        if (!current.includes(groupKey)) {
          set({ hiddenColumns: [...current, groupKey], lastModified: Date.now() });
        }
      },

      showColumn: (groupKey) => {
        const current = get().hiddenColumns;
        set({
          hiddenColumns: current.filter((k) => k !== groupKey),
          lastModified: Date.now(),
        });
      },

      isColumnHidden: (groupKey) => {
        return get().hiddenColumns.includes(groupKey);
      },

      getHiddenColumns: () => {
        return get().hiddenColumns;
      },

      clearHiddenColumns: () => {
        set({ hiddenColumns: [], lastModified: Date.now() });
      },

      // Highlight (double-tap) - non persisté, état temporaire
      setHighlightedColumns: (groupKeys) => {
        set({ highlightedColumns: groupKeys });
      },

      toggleHighlightColumn: (groupKey) => {
        const current = get().highlightedColumns;
        const isHighlighted = current.includes(groupKey);
        const newHighlighted = isHighlighted
          ? current.filter((k) => k !== groupKey)
          : [...current, groupKey];
        set({ highlightedColumns: newHighlighted });
      },

      isColumnHighlighted: (groupKey) => {
        return get().highlightedColumns.includes(groupKey);
      },

      clearHighlightedColumns: () => {
        set({ highlightedColumns: [] });
      },

      restoreSession: () => {
        const state = get();
        if (state.lastModified > 0 && state.lastHtmlPath) {
          return {
            lastHtmlPath: state.lastHtmlPath,
            lastLcscPath: state.lastLcscPath,
            selectedComponents: state.selectedComponents,
            processedItems: state.processedItems,
            validatedColumns: state.validatedColumns,
            hiddenColumns: state.hiddenColumns,
            highlightedColumns: [], // Ne pas restaurer les highlights
            lastModified: state.lastModified,
          };
        }
        return null;
      },

      clearSession: () => {
        set({
          ...defaultSession,
          lastModified: 0,
        });
      },
    }),
    {
      name: 'ibom-session',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Ne pas persister les colonnes surlignées (état temporaire)
      partialize: (state) => ({
        lastHtmlPath: state.lastHtmlPath,
        lastLcscPath: state.lastLcscPath,
        selectedComponents: state.selectedComponents,
        processedItems: state.processedItems,
        validatedColumns: state.validatedColumns,
        hiddenColumns: state.hiddenColumns,
        lastModified: state.lastModified,
      }),
    }
  )
);

export default useSessionStore;
