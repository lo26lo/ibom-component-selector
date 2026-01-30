/**
 * Store de session - Persistance de l'état de travail actuel
 * 
 * SYSTÈME SIMPLIFIÉ: Un seul état par composant (groupKey)
 * États possibles: 'validated' | 'hidden' | 'highlighted' | null (normal)
 * 
 * - Swipe gauche = validated (vert)
 * - Swipe droite = hidden (gris)  
 * - Double-tap = highlighted (rouge)
 * - Sélection rectangle PCB = état temporaire séparé (rouge)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Component, SelectionRect } from '../core/types';

// Type unique pour l'état d'un composant
export type ComponentStatus = 'validated' | 'hidden' | 'highlighted';

// État de session sauvegardé
export interface SessionState {
  // Fichiers chargés
  lastHtmlPath: string | null;
  lastLcscPath: string | null;

  // Composants sélectionnés
  selectedComponents: Component[];

  // Composants traités (ancienne logique, gardée pour compatibilité)
  processedItems: string[];

  // NOUVEAU: État unique par composant (groupKey -> status)
  componentStatus: Record<string, ComponentStatus>;

  // Sélection rectangle sur le PCB (liste de refs)
  rectangleSelectedRefs: string[];

  // Rectangle de sélection (coordonnées board)
  selectionRect: SelectionRect | null;

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

  // NOUVEAU: Actions unifiées pour l'état des composants
  setComponentStatus: (groupKey: string, status: ComponentStatus | null) => void;
  getComponentStatus: (groupKey: string) => ComponentStatus | null;
  toggleStatus: (groupKey: string, status: ComponentStatus) => void;
  
  // Helpers pour vérifier l'état
  isValidated: (groupKey: string) => boolean;
  isHidden: (groupKey: string) => boolean;
  isHighlighted: (groupKey: string) => boolean;

  // Actions pour récupérer les listes par état
  getValidatedKeys: () => string[];
  getHiddenKeys: () => string[];
  getHighlightedKeys: () => string[];

  // Actions pour effacer par type
  clearValidated: () => void;
  clearHidden: () => void;
  clearHighlighted: () => void;
  clearAllStatus: () => void;

  // Action pour restaurer une session
  restoreSession: () => SessionState | null;

  // Action pour effacer la session
  clearSession: () => void;

  // Action pour la sélection rectangle
  setRectangleSelectedRefs: (refs: string[]) => void;
  getRectangleSelectedRefs: () => string[];
  clearRectangleSelection: () => void;
  
  // Action pour le rectangle de sélection
  setSelectionRect: (rect: SelectionRect | null) => void;
  getSelectionRect: () => SelectionRect | null;

  // === COMPATIBILITÉ (pour migration progressive) ===
  // Ces fonctions redirigent vers le nouveau système
  toggleColumnValidated: (groupKey: string) => void;
  isColumnValidated: (groupKey: string) => boolean;
  clearValidatedColumns: () => void;
  hideColumn: (groupKey: string) => void;
  showColumn: (groupKey: string) => void;
  isColumnHidden: (groupKey: string) => boolean;
  getHiddenColumns: () => string[];
  clearHiddenColumns: () => void;
  toggleHighlightColumn: (groupKey: string) => void;
  isColumnHighlighted: (groupKey: string) => boolean;
  clearHighlightedColumns: () => void;
}

const defaultSession: SessionState = {
  lastHtmlPath: null,
  lastLcscPath: null,
  selectedComponents: [],
  processedItems: [],
  componentStatus: {},
  rectangleSelectedRefs: [],
  selectionRect: null,
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

      // === NOUVEAU SYSTÈME UNIFIÉ ===

      setComponentStatus: (groupKey, status) => {
        const current = { ...get().componentStatus };
        if (status === null) {
          delete current[groupKey];
        } else {
          current[groupKey] = status;
        }
        set({ componentStatus: current, lastModified: Date.now() });
      },

      getComponentStatus: (groupKey) => {
        return get().componentStatus[groupKey] || null;
      },

      toggleStatus: (groupKey, status) => {
        const current = get().componentStatus[groupKey];
        const newStatus = current === status ? null : status;
        get().setComponentStatus(groupKey, newStatus);
      },

      isValidated: (groupKey) => get().componentStatus[groupKey] === 'validated',
      isHidden: (groupKey) => get().componentStatus[groupKey] === 'hidden',
      isHighlighted: (groupKey) => get().componentStatus[groupKey] === 'highlighted',

      getValidatedKeys: () => {
        const status = get().componentStatus;
        return Object.keys(status).filter(k => status[k] === 'validated');
      },

      getHiddenKeys: () => {
        const status = get().componentStatus;
        return Object.keys(status).filter(k => status[k] === 'hidden');
      },

      getHighlightedKeys: () => {
        const status = get().componentStatus;
        return Object.keys(status).filter(k => status[k] === 'highlighted');
      },

      clearValidated: () => {
        const current = { ...get().componentStatus };
        Object.keys(current).forEach(k => {
          if (current[k] === 'validated') delete current[k];
        });
        set({ componentStatus: current, lastModified: Date.now() });
      },

      clearHidden: () => {
        const current = { ...get().componentStatus };
        Object.keys(current).forEach(k => {
          if (current[k] === 'hidden') delete current[k];
        });
        set({ componentStatus: current, lastModified: Date.now() });
      },

      clearHighlighted: () => {
        const current = { ...get().componentStatus };
        Object.keys(current).forEach(k => {
          if (current[k] === 'highlighted') delete current[k];
        });
        set({ componentStatus: current, lastModified: Date.now() });
      },

      clearAllStatus: () => {
        set({ componentStatus: {}, lastModified: Date.now() });
      },

      // === COMPATIBILITÉ AVEC L'ANCIEN CODE ===

      // Colonnes validées (redirige vers le nouveau système)
      toggleColumnValidated: (groupKey) => get().toggleStatus(groupKey, 'validated'),
      isColumnValidated: (groupKey) => get().isValidated(groupKey),
      clearValidatedColumns: () => get().clearValidated(),

      // Colonnes masquées (redirige vers le nouveau système)
      hideColumn: (groupKey) => get().setComponentStatus(groupKey, 'hidden'),
      showColumn: (groupKey) => get().setComponentStatus(groupKey, null),
      isColumnHidden: (groupKey) => get().isHidden(groupKey),
      getHiddenColumns: () => get().getHiddenKeys(),
      clearHiddenColumns: () => get().clearHidden(),

      // Colonnes surlignées (redirige vers le nouveau système)
      toggleHighlightColumn: (groupKey) => get().toggleStatus(groupKey, 'highlighted'),
      isColumnHighlighted: (groupKey) => get().isHighlighted(groupKey),
      clearHighlightedColumns: () => get().clearHighlighted(),

      // Sélection rectangle PCB
      setRectangleSelectedRefs: (refs) => set({ rectangleSelectedRefs: refs, lastModified: Date.now() }),
      getRectangleSelectedRefs: () => get().rectangleSelectedRefs,
      clearRectangleSelection: () => set({ rectangleSelectedRefs: [], selectionRect: null, lastModified: Date.now() }),

      // Rectangle de sélection (coordonnées board)
      setSelectionRect: (rect) => set({ selectionRect: rect, lastModified: Date.now() }),
      getSelectionRect: () => get().selectionRect,

      restoreSession: () => {
        const state = get();
        if (state.lastModified > 0 && state.lastHtmlPath) {
          return {
            lastHtmlPath: state.lastHtmlPath,
            lastLcscPath: state.lastLcscPath,
            selectedComponents: state.selectedComponents,
            processedItems: state.processedItems,
            componentStatus: state.componentStatus,
            rectangleSelectedRefs: state.rectangleSelectedRefs,
            selectionRect: state.selectionRect,
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
      version: 2, // Nouvelle version pour migration
      migrate: (persistedState: any, version: number) => {
        // Migration depuis l'ancien format (version 0 ou 1)
        if (version < 2) {
          console.log('Migration session store vers v2...');
          const oldState = persistedState as any;
          const newComponentStatus: Record<string, ComponentStatus> = {};
          
          // Migrer validatedColumns -> componentStatus
          if (Array.isArray(oldState.validatedColumns)) {
            oldState.validatedColumns.forEach((key: string) => {
              newComponentStatus[key] = 'validated';
            });
          }
          
          // Migrer hiddenColumns -> componentStatus (écrase validated si conflit)
          if (Array.isArray(oldState.hiddenColumns)) {
            oldState.hiddenColumns.forEach((key: string) => {
              newComponentStatus[key] = 'hidden';
            });
          }
          
          // Ne pas migrer highlightedColumns (état temporaire)
          
          return {
            ...defaultSession,
            lastHtmlPath: oldState.lastHtmlPath || null,
            lastLcscPath: oldState.lastLcscPath || null,
            selectedComponents: oldState.selectedComponents || [],
            processedItems: oldState.processedItems || [],
            componentStatus: newComponentStatus,
            rectangleSelectedRefs: oldState.rectangleSelectedRefs || [],
            lastModified: oldState.lastModified || 0,
          };
        }
        // Assurer que rectangleSelectedRefs existe pour v2 aussi
        const state = persistedState as any;
        if (!state.rectangleSelectedRefs) {
          state.rectangleSelectedRefs = [];
        }
        return state as SessionStoreState;
      },
      onRehydrateStorage: () => (state: SessionStoreState | undefined) => {
        state?.setHasHydrated(true);
      },
      // Persister toutes les données importantes (y compris highlighted)
      partialize: (state: SessionStoreState) => {
        return {
          lastHtmlPath: state.lastHtmlPath,
          lastLcscPath: state.lastLcscPath,
          selectedComponents: state.selectedComponents,
          processedItems: state.processedItems,
          componentStatus: state.componentStatus,
          rectangleSelectedRefs: state.rectangleSelectedRefs,
          selectionRect: state.selectionRect,
          lastModified: state.lastModified,
        };
      },
    }
  )
);

export default useSessionStore;
