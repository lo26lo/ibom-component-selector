/**
 * Store des préférences utilisateur (persisté)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences } from '../core/types';

interface PreferencesState extends Preferences {
  // Actions
  setEinkMode: (value: boolean) => void;
  setGroupByValue: (value: boolean) => void;
  setAutoHighlight: (value: boolean) => void;
  setFontSize: (value: number) => void;
  setVibrationEnabled: (value: boolean) => void;
  resetPreferences: () => void;
}

const defaultPreferences: Preferences = {
  einkMode: false,
  groupByValue: true,
  autoHighlight: true,
  fontSize: 11,
  vibrationEnabled: true,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setEinkMode: (value) => set({ einkMode: value }),
      
      setGroupByValue: (value) => set({ groupByValue: value }),
      
      setAutoHighlight: (value) => set({ autoHighlight: value }),
      
      setFontSize: (value) => set({ fontSize: value }),
      
      setVibrationEnabled: (value) => set({ vibrationEnabled: value }),
      
      resetPreferences: () => set(defaultPreferences),
    }),
    {
      name: 'ibom-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default usePreferencesStore;
