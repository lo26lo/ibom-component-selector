/**
 * ExportModal - Modal pour exporter les données
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Share, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { useTheme } from '../../theme';
import { useAppStore, useSessionStore } from '../../store';
import { ThemedModal, ThemedButton, ThemedToggle } from '../common';
import { generateCSV, generateLCSCCSV } from '../../core/CSVLoader';
import { spacing, fontSize } from '../../theme/spacing';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const { theme } = useTheme();

  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);
  const currentHtmlPath = useAppStore((s) => s.currentHtmlPath);
  
  // Session store pour les statuts
  const componentStatus = useSessionStore((s) => s.componentStatus);

  const [exportProcessedOnly, setExportProcessedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const componentsToExport = exportProcessedOnly
    ? selectedComponents.filter((c) => {
        const key = `${c.value}|${c.footprint}|${c.lcsc}`;
        return processedItems.has(key);
      })
    : selectedComponents;

  // Partager l'état complet (JSON avec statuts)
  const handleShareState = useCallback(async () => {
    try {
      const stateData = {
        timestamp: new Date().toISOString(),
        htmlPath: currentHtmlPath,
        componentsCount: selectedComponents.length,
        componentStatus: componentStatus,
        summary: {
          validated: Object.values(componentStatus).filter(s => s === 'validated').length,
          hidden: Object.values(componentStatus).filter(s => s === 'hidden').length,
          highlighted: Object.values(componentStatus).filter(s => s === 'highlighted').length,
        }
      };

      const jsonStr = JSON.stringify(stateData, null, 2);
      
      await Share.share({
        message: jsonStr,
        title: 'État IBom Selector',
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, [currentHtmlPath, selectedComponents, componentStatus]);

  const handleExportLCSC = useCallback(async () => {
    try {
      if (componentsToExport.length === 0) {
        Alert.alert('Erreur', 'Aucun composant à exporter');
        return;
      }

      setIsExporting(true);
      
      const csv = generateLCSCCSV(componentsToExport);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `IBom_LCSC_${timestamp}.csv`;
      
      // Sauvegarder dans le dossier Downloads
      const downloadDir = Platform.OS === 'android' 
        ? RNFS.DownloadDirectoryPath 
        : RNFS.DocumentDirectoryPath;
      const filePath = `${downloadDir}/${filename}`;
      
      await RNFS.writeFile(filePath, csv, 'utf8');
      
      setIsExporting(false);
      Alert.alert(
        'Export réussi ✓',
        `${componentsToExport.length} composants exportés\n\nFichier: ${filename}\nDossier: Downloads`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      setIsExporting(false);
      Alert.alert('Erreur', `Export échoué: ${error.message}`);
    }
  }, [componentsToExport, onClose]);

  const handleExportCSV = useCallback(async () => {
    try {
      if (componentsToExport.length === 0) {
        Alert.alert('Erreur', 'Aucun composant à exporter');
        return;
      }

      setIsExporting(true);
      
      const csv = generateCSV(componentsToExport);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `IBom_BOM_${timestamp}.csv`;
      
      const downloadDir = Platform.OS === 'android' 
        ? RNFS.DownloadDirectoryPath 
        : RNFS.DocumentDirectoryPath;
      const filePath = `${downloadDir}/${filename}`;
      
      await RNFS.writeFile(filePath, csv, 'utf8');
      
      setIsExporting(false);
      Alert.alert(
        'Export réussi ✓',
        `${componentsToExport.length} composants exportés\n\nFichier: ${filename}\nDossier: Downloads`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      setIsExporting(false);
      Alert.alert('Erreur', `Export échoué: ${error.message}`);
    }
  }, [componentsToExport, onClose]);

  const handleExportRefList = useCallback(async () => {
    try {
      if (componentsToExport.length === 0) {
        Alert.alert('Erreur', 'Aucun composant à exporter');
        return;
      }

      const refs = componentsToExport.map((c) => c.ref).join(', ');
      
      // Utiliser Share pour partager la liste
      const result = await Share.share({
        message: refs,
        title: 'Liste des références',
      });
      
      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, [componentsToExport, onClose]);

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Exporter">
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {componentsToExport.length} composants à exporter
        </Text>

        {/* Options */}
        <ThemedToggle
          label="Uniquement traités"
          value={exportProcessedOnly}
          onValueChange={setExportProcessedOnly}
        />

        {/* Export buttons */}
        <View style={styles.exportButtons}>
          <ThemedButton
            title="Export LCSC/JLCPCB"
            onPress={handleExportLCSC}
            disabled={isExporting || componentsToExport.length === 0}
            style={styles.exportButton}
          />
          <ThemedButton
            title="Export BOM CSV"
            onPress={handleExportCSV}
            disabled={isExporting || componentsToExport.length === 0}
            style={styles.exportButton}
          />
          <ThemedButton
            title="Partager références"
            onPress={handleExportRefList}
            disabled={componentsToExport.length === 0}
            style={styles.exportButton}
          />
          <ThemedButton
            title="📤 Partager état (JSON)"
            onPress={handleShareState}
            style={styles.exportButton}
          />
        </View>

        <View style={styles.footer}>
          <ThemedButton title="Fermer" onPress={onClose} />
        </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  statsText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  exportButtons: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  exportButton: {
    width: '100%',
    height: 50,
  },
  footer: {
    marginTop: spacing.lg,
  },
});

export default ExportModal;
