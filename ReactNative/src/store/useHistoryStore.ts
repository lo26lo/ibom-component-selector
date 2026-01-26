/**
 * Store de l'historique des sélections
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, Component } from '../core/types';

interface HistoryState {
  // Historiques par fichier HTML
  histories: { [htmlPath: string]: HistoryEntry[] };
  
  // Index de l'entrée courante
  currentIndex: number | null;
  
  // Fichier HTML courant
  currentHtmlPath: string | null;

  // Actions
  setCurrentHtmlPath: (path: string) => void;
  
  addEntry: (
    name: string,
    components: Component[],
    processedItems: string[],
    rect?: [number, number, number, number]
  ) => number;
  
  // Alias pour compatibilité avec HomeScreen
  addHistory: (htmlPath: string, entry: { timestamp: number; name: string; selectedComponents: Component[]; processedItems: string[] }) => void;
  loadHistory: () => Promise<void>;
  
  updateEntry: (
    index: number,
    components: Component[],
    processedItems: string[]
  ) => boolean;
  
  deleteEntry: (index: number) => boolean;
  
  getEntries: () => HistoryEntry[];
  
  getEntry: (index: number) => HistoryEntry | null;
  
  setCurrentIndex: (index: number | null) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      histories: {},
      currentIndex: null,
      currentHtmlPath: null,

      setCurrentHtmlPath: (path) => {
        set({ currentHtmlPath: path, currentIndex: null });
      },

      // Alias pour compatibilité avec HomeScreen
      addHistory: (htmlPath, entry) => {
        const { histories } = get();
        const historyEntry: HistoryEntry = {
          id: entry.timestamp.toString(),
          name: entry.name,
          date: new Date(entry.timestamp).toLocaleString('fr-FR'),
          components: entry.selectedComponents.map((c) => ({
            ref: c.ref,
            value: c.value,
            footprint: c.footprint,
            lcsc: c.lcsc,
            layer: c.layer,
            x: c.x,
            y: c.y,
            rotation: c.rotation,
            qty: c.qty,
          })),
          processedItems: entry.processedItems,
        };
        
        const currentHistory = histories[htmlPath] || [];
        const newHistory = [...currentHistory, historyEntry];
        
        set({
          histories: { ...histories, [htmlPath]: newHistory },
        });
      },
      
      loadHistory: async () => {
        // L'historique est chargé automatiquement par persist/zustand
        // Cette fonction existe pour compatibilité avec l'interface
      },

      addEntry: (name, components, processedItems, rect) => {
        const { currentHtmlPath, histories } = get();
        if (!currentHtmlPath) return -1;

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          name,
          date: new Date().toLocaleString('fr-FR'),
          components: components.map((c) => ({
            ref: c.ref,
            value: c.value,
            footprint: c.footprint,
            lcsc: c.lcsc,
            layer: c.layer,
            x: c.x,
            y: c.y,
            rotation: c.rotation,
            qty: c.qty,
          })),
          processedItems,
          rect,
        };

        const currentHistory = histories[currentHtmlPath] || [];
        const newHistory = [...currentHistory, entry];
        const newIndex = newHistory.length - 1;

        set({
          histories: { ...histories, [currentHtmlPath]: newHistory },
          currentIndex: newIndex,
        });

        return newIndex;
      },

      updateEntry: (index, components, processedItems) => {
        const { currentHtmlPath, histories } = get();
        if (!currentHtmlPath) return false;

        const currentHistory = histories[currentHtmlPath];
        if (!currentHistory || index < 0 || index >= currentHistory.length) {
          return false;
        }

        const updatedEntry: HistoryEntry = {
          ...currentHistory[index],
          date: new Date().toLocaleString('fr-FR'),
          components: components.map((c) => ({
            ref: c.ref,
            value: c.value,
            footprint: c.footprint,
            lcsc: c.lcsc,
            layer: c.layer,
            x: c.x,
            y: c.y,
            rotation: c.rotation,
            qty: c.qty,
          })),
          processedItems,
        };

        const newHistory = [...currentHistory];
        newHistory[index] = updatedEntry;

        set({
          histories: { ...histories, [currentHtmlPath]: newHistory },
        });

        return true;
      },

      deleteEntry: (index) => {
        const { currentHtmlPath, histories, currentIndex } = get();
        if (!currentHtmlPath) return false;

        const currentHistory = histories[currentHtmlPath];
        if (!currentHistory || index < 0 || index >= currentHistory.length) {
          return false;
        }

        const newHistory = currentHistory.filter((_, i) => i !== index);

        let newCurrentIndex = currentIndex;
        if (currentIndex === index) {
          newCurrentIndex = null;
        } else if (currentIndex !== null && currentIndex > index) {
          newCurrentIndex = currentIndex - 1;
        }

        set({
          histories: { ...histories, [currentHtmlPath]: newHistory },
          currentIndex: newCurrentIndex,
        });

        return true;
      },

      getEntries: () => {
        const { currentHtmlPath, histories } = get();
        if (!currentHtmlPath) return [];
        return histories[currentHtmlPath] || [];
      },

      getEntry: (index) => {
        const entries = get().getEntries();
        if (index < 0 || index >= entries.length) return null;
        return entries[index];
      },

      setCurrentIndex: (index) => set({ currentIndex: index }),
    }),
    {
      name: 'ibom-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useHistoryStore;
