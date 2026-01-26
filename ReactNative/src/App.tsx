/**
 * App.tsx - Point d'entrée principal de l'application React Native IBom Selector
 *
 * Migration complète depuis Kivy/Python vers React Native/TypeScript
 * Toutes les fonctionnalités de l'application originale sont préservées:
 * - Chargement et parsing de fichiers IBom HTML
 * - Chargement de fichiers CSV LCSC
 * - Vue PCB interactive avec zoom/pan
 * - Sélection rectangulaire de composants
 * - Liste des composants avec filtres et tri
 * - Historique des sélections
 * - Export CSV et liste de références
 * - Mode E-ink pour écrans e-paper
 * - Sauvegarde automatique
 * - Retour haptique
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { ThemeProvider } from './theme';
import { usePreferencesStore, useHistoryStore } from './store';
import { HomeScreen, LoadingScreen } from './screens';

// Ignorer certains warnings en développement
LogBox.ignoreLogs([
  'Require cycle:',
  'ViewPropTypes will be removed',
]);

function AppContent() {
  const [isReady, setIsReady] = useState(false);

  // Hydrate les stores au démarrage
  const hydratePreferences = usePreferencesStore((s) => s._hasHydrated);
  const loadHistory = useHistoryStore((s) => s.loadHistory);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Charger l'historique depuis AsyncStorage
        await loadHistory();
        
        // Petit délai pour l'animation
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        setIsReady(true);
      } catch (error) {
        console.error('Erreur initialisation:', error);
        setIsReady(true); // Continuer même en cas d'erreur
      }
    };

    initialize();
  }, [loadHistory]);

  if (!isReady) {
    return <LoadingScreen message="Initialisation..." />;
  }

  return <HomeScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
