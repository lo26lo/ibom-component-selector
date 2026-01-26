/**
 * Store principal de l'application
 */

import { create } from 'zustand';
import type { Component, ListFilters, SelectionRect, BoundingBox } from '../core/types';
import { IBomParser } from '../core/IBomParser';

interface AppState {
  // Parser et données
  parser: IBomParser | null;
  components: Component[];
  boardBbox: BoundingBox;
  htmlFilePath: string | null;
  lcscFilePath: string | null;

  // Sélection
  selectedComponents: Component[];
  highlightedComponents: Component[];
  selectionRect: SelectionRect | null;

  // Composants traités
  processedItems: Set<string>;

  // Filtres de liste
  filters: ListFilters;

  // Navigation séquentielle
  currentNavIndex: number;

  // Chargement
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  setParser: (parser: IBomParser) => void;
  setHtmlFilePath: (path: string) => void;
  setLcscFilePath: (path: string) => void;
  
  setSelectedComponents: (components: Component[]) => void;
  addToSelection: (components: Component[]) => void;
  clearSelection: () => void;
  selectAll: () => void;

  setHighlightedComponents: (components: Component[]) => void;
  clearHighlight: () => void;

  setSelectionRect: (rect: SelectionRect | null) => void;

  toggleProcessed: (key: string) => void;
  markAllProcessed: (processed: boolean) => void;
  clearProcessed: () => void;
  isProcessed: (key: string) => boolean;

  setFilter: <K extends keyof ListFilters>(key: K, value: ListFilters[K]) => void;
  resetFilters: () => void;

  navigateNext: () => void;
  navigatePrev: () => void;
  setNavIndex: (index: number) => void;

  setLoading: (loading: boolean, message?: string) => void;

  reset: () => void;
}

const defaultFilters: ListFilters = {
  layer: 'all',
  status: 'all',
  search: '',
  sortColumn: 'ref',
  sortReverse: false,
  groupByValue: true,
};

const defaultBbox: BoundingBox = { minx: 0, miny: 0, maxx: 100, maxy: 100 };

export const useAppStore = create<AppState>((set, get) => ({
  // État initial
  parser: null,
  components: [],
  boardBbox: defaultBbox,
  htmlFilePath: null,
  lcscFilePath: null,

  selectedComponents: [],
  highlightedComponents: [],
  selectionRect: null,

  processedItems: new Set<string>(),

  filters: { ...defaultFilters },

  currentNavIndex: -1,

  isLoading: false,
  loadingMessage: '',

  // Actions
  setParser: (parser) => {
    set({
      parser,
      components: parser.getComponents(),
      boardBbox: parser.getBoardBbox(),
      selectedComponents: [],
      highlightedComponents: [],
      processedItems: new Set<string>(),
      currentNavIndex: -1,
    });
  },

  setHtmlFilePath: (path) => set({ htmlFilePath: path }),
  setLcscFilePath: (path) => set({ lcscFilePath: path }),

  setSelectedComponents: (components) => set({ selectedComponents: components }),
  
  addToSelection: (components) => {
    const current = get().selectedComponents;
    const newRefs = new Set(components.map((c) => c.ref));
    const filtered = current.filter((c) => !newRefs.has(c.ref));
    set({ selectedComponents: [...filtered, ...components] });
  },

  clearSelection: () => set({ selectedComponents: [], selectionRect: null }),

  selectAll: () => set({ selectedComponents: [...get().components] }),

  setHighlightedComponents: (components) => set({ highlightedComponents: components }),
  clearHighlight: () => set({ highlightedComponents: [] }),

  setSelectionRect: (rect) => set({ selectionRect: rect }),

  toggleProcessed: (key) => {
    const items = new Set(get().processedItems);
    if (items.has(key)) {
      items.delete(key);
    } else {
      items.add(key);
    }
    set({ processedItems: items });
  },

  markAllProcessed: (processed) => {
    if (processed) {
      const allKeys = get().selectedComponents.map(
        (c) => `${c.value}|${c.footprint}|${c.lcsc}`
      );
      set({ processedItems: new Set(allKeys) });
    } else {
      set({ processedItems: new Set<string>() });
    }
  },

  clearProcessed: () => set({ processedItems: new Set<string>() }),

  isProcessed: (key) => get().processedItems.has(key),

  setFilter: (key, value) => {
    set({ filters: { ...get().filters, [key]: value } });
  },

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  navigateNext: () => {
    const { selectedComponents, currentNavIndex } = get();
    if (selectedComponents.length === 0) return;
    
    const nextIndex = (currentNavIndex + 1) % selectedComponents.length;
    set({
      currentNavIndex: nextIndex,
      highlightedComponents: [selectedComponents[nextIndex]],
    });
  },

  navigatePrev: () => {
    const { selectedComponents, currentNavIndex } = get();
    if (selectedComponents.length === 0) return;
    
    const prevIndex =
      currentNavIndex <= 0 ? selectedComponents.length - 1 : currentNavIndex - 1;
    set({
      currentNavIndex: prevIndex,
      highlightedComponents: [selectedComponents[prevIndex]],
    });
  },

  setNavIndex: (index) => set({ currentNavIndex: index }),

  setLoading: (loading, message = '') => {
    set({ isLoading: loading, loadingMessage: message });
  },

  reset: () => {
    set({
      parser: null,
      components: [],
      boardBbox: defaultBbox,
      htmlFilePath: null,
      selectedComponents: [],
      highlightedComponents: [],
      selectionRect: null,
      processedItems: new Set<string>(),
      filters: { ...defaultFilters },
      currentNavIndex: -1,
      isLoading: false,
      loadingMessage: '',
    });
  },
}));

export default useAppStore;
