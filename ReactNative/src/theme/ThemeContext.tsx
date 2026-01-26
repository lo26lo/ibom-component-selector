/**
 * ThemeContext - Contexte React pour le thème
 */

import React, { createContext, useContext, useMemo } from 'react';
import { ThemeColors, getTheme } from './colors';
import { usePreferencesStore } from '../store/usePreferencesStore';

interface ThemeContextValue {
  theme: ThemeColors;
  isEinkMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const einkMode = usePreferencesStore((state) => state.einkMode);

  const value = useMemo(
    () => ({
      theme: getTheme(einkMode),
      isEinkMode: einkMode,
    }),
    [einkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
