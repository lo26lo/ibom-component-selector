/**
 * Store des préférences utilisateur (persisté)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences } from '../core/types';

interface PreferencesState extends Preferences {
  // Hydration status
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Actions
  setEinkMode: (value: boolean) => void;
  setGroupByValue: (value: boolean) => void;
  setAutoHighlight: (value: boolean) => void;
  setFontSize: (value: number) => void;
  setVibrationEnabled: (value: boolean) => void;
  setAutoSave: (value: boolean) => void;
  setAutoSaveMinutes: (value: number) => void;
  resetPreferences: () => void;
}

const defaultPreferences: Preferences = {
  einkMode: false,
  groupByValue: true,
  autoHighlight: true,
  fontSize: 11,
  vibrationEnabled: true,
  autoSave: false,
  autoSaveMinutes: 5,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setEinkMode: (value) => set({ einkMode: value }),
      
      setGroupByValue: (value) => set({ groupByValue: value }),
      
      setAutoHighlight: (value) => set({ autoHighlight: value }),
      
      setFontSize: (value) => set({ fontSize: value }),
      
      setVibrationEnabled: (value) => set({ vibrationEnabled: value }),
      
      setAutoSave: (value) => set({ autoSave: value }),
      
      setAutoSaveMinutes: (value) => set({ autoSaveMinutes: value }),
      
      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'ibom-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default usePreferencesStore;
