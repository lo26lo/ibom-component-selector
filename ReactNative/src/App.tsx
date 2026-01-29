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
 * - Restauration automatique de la dernière session
 * - Gestion des colonnes validées/masquées/surlignées
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { ThemeProvider } from './theme';
import { usePreferencesStore, useHistoryStore, useSessionStore } from './store';
import { HomeScreen, LoadingScreen } from './screens';
import { useEinkDetect, ToastProvider } from './hooks';

// Ignorer certains warnings en développement
LogBox.ignoreLogs([
  'Require cycle:',
  'ViewPropTypes will be removed',
]);

function AppContent() {
  const [isReady, setIsReady] = useState(false);

  // Détection automatique e-ink au démarrage
  useEinkDetect();

  // Hydrate les stores au démarrage
  const hydratePreferences = usePreferencesStore((s) => s._hasHydrated);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const sessionHasHydrated = useSessionStore((s) => s._hasHydrated);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Charger l'historique depuis AsyncStorage
        await loadHistory();
        
        // Attendre que le store de session soit hydraté
        // (zustand persist le fait automatiquement)
        
        // Petit délai pour l'animation et hydratation
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        setIsReady(true);
      } catch (error) {
        console.error('Erreur initialisation:', error);
        setIsReady(true); // Continuer même en cas d'erreur
      }
    };

    initialize();
  }, [loadHistory]);

  // Attendre que tous les stores soient hydratés
  if (!isReady || !sessionHasHydrated) {
    return <LoadingScreen message="Restauration de la session..." />;
  }

  return <HomeScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
