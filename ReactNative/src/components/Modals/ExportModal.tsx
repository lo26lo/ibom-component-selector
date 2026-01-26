/**
 * ExportModal - Modal pour exporter les données
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store';
import { ThemedModal, ThemedButton, ThemedToggle } from '../common';
import { CSVLoader } from '../../core/CSVLoader';
import { spacing, fontSize } from '../../theme/spacing';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const { theme } = useTheme();

  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);

  const [exportProcessedOnly, setExportProcessedOnly] = useState(false);
  const [exportCSV, setExportCSV] = useState(true);

  const componentsToExport = exportProcessedOnly
    ? selectedComponents.filter((c) => {
        const key = `${c.value}|${c.footprint}|${c.lcsc}`;
        return processedItems.has(key);
      })
    : selectedComponents;

  const handleExportLCSC = useCallback(async () => {
    try {
      if (componentsToExport.length === 0) {
        Alert.alert('Erreur', 'Aucun composant à exporter');
        return;
      }

      const csv = CSVLoader.toCSV(componentsToExport);
      
      // In real implementation, use react-native-fs to save
      // For now just show the count
      Alert.alert(
        'Export',
        `${componentsToExport.length} composants exportés au format LCSC CSV`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, [componentsToExport, onClose]);

  const handleExportRefList = useCallback(async () => {
    try {
      if (componentsToExport.length === 0) {
        Alert.alert('Erreur', 'Aucun composant à exporter');
        return;
      }

      const refs = componentsToExport.map((c) => c.ref).join('\n');
      
      // In real implementation, use Clipboard or share
      Alert.alert(
        'Export',
        `${componentsToExport.length} références exportées`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, [componentsToExport, onClose]);

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Exporter">
      <View style={styles.content}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {componentsToExport.length} composants à exporter
        </Text>

        {/* Options */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Uniquement traités
          </Text>
          <ThemedToggle
            value={exportProcessedOnly}
            onValueChange={setExportProcessedOnly}
          />
        </View>

        {/* Export buttons */}
        <View style={styles.exportButtons}>
          <ThemedButton
            title="Export CSV LCSC"
            onPress={handleExportLCSC}
            style={styles.exportButton}
          />
          <ThemedButton
            title="Liste des refs"
            onPress={handleExportRefList}
            style={styles.exportButton}
          />
        </View>

        <View style={styles.footer}>
          <ThemedButton title="Fermer" onPress={onClose} />
        </View>
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  statsText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    flex: 1,
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
