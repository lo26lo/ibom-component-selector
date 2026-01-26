/**
 * FilePicker - Modal pour sélectionner les fichiers HTML et CSV
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { ThemedModal, ThemedButton, ProgressBar } from '../common';
import { useFileSystem } from '../../hooks';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface FilePickerProps {
  visible: boolean;
  onClose: () => void;
  onFilesLoaded: (htmlPath: string, csvPath?: string) => void;
}

export function FilePicker({
  visible,
  onClose,
  onFilesLoaded,
}: FilePickerProps) {
  const { theme, isEinkMode } = useTheme();
  const {
    pickAndLoadHtml,
    pickAndLoadCsv,
    loading,
    progress,
    error,
    pcbData,
    components,
    clearData,
  } = useFileSystem();

  const [htmlPath, setHtmlPath] = useState<string | null>(null);
  const [csvPath, setCsvPath] = useState<string | null>(null);

  const handlePickHtml = useCallback(async () => {
    try {
      const result = await pickAndLoadHtml();
      if (result) {
        setHtmlPath(result.path);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }, [pickAndLoadHtml]);

  const handlePickCsv = useCallback(async () => {
    try {
      const result = await pickAndLoadCsv();
      if (result) {
        setCsvPath(result.path);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }, [pickAndLoadCsv]);

  const handleConfirm = useCallback(() => {
    if (htmlPath) {
      onFilesLoaded(htmlPath, csvPath || undefined);
      setHtmlPath(null);
      setCsvPath(null);
      clearData();
      onClose();
    }
  }, [htmlPath, csvPath, onFilesLoaded, clearData, onClose]);

  const handleCancel = useCallback(() => {
    setHtmlPath(null);
    setCsvPath(null);
    clearData();
    onClose();
  }, [clearData, onClose]);

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <ThemedModal visible={visible} onClose={handleCancel} title="Charger fichiers">
      <View style={styles.content}>
        {/* HTML file selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Fichier IBom HTML *
          </Text>
          <View style={styles.fileRow}>
            <View
              style={[
                styles.filePath,
                {
                  backgroundColor: isEinkMode ? '#ffffff' : theme.bgSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[styles.filePathText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {htmlPath ? getFileName(htmlPath) : 'Aucun fichier'}
              </Text>
            </View>
            <ThemedButton
              title="Parcourir"
              onPress={handlePickHtml}
              disabled={loading}
              style={styles.browseButton}
            />
          </View>
        </View>

        {/* CSV file selection (optional) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Fichier LCSC CSV (optionnel)
          </Text>
          <View style={styles.fileRow}>
            <View
              style={[
                styles.filePath,
                {
                  backgroundColor: isEinkMode ? '#ffffff' : theme.bgSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[styles.filePathText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {csvPath ? getFileName(csvPath) : 'Aucun fichier'}
              </Text>
            </View>
            <ThemedButton
              title="Parcourir"
              onPress={handlePickCsv}
              disabled={loading}
              style={styles.browseButton}
            />
          </View>
        </View>

        {/* Loading progress */}
        {loading && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              Chargement...
            </Text>
            <ProgressBar current={progress} total={100} />
          </View>
        )}

        {/* Error display */}
        {error && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        )}

        {/* PCB data info */}
        {pcbData && (
          <View style={styles.infoSection}>
            <Text style={[styles.infoText, { color: theme.textPrimary }]}>
              ✓ {pcbData.components.length} composants trouvés
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              PCB: {pcbData.title || 'Sans titre'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttons}>
          <ThemedButton
            title="Annuler"
            onPress={handleCancel}
            disabled={loading}
            style={styles.button}
          />
          <ThemedButton
            title="Charger"
            onPress={handleConfirm}
            disabled={!htmlPath || loading}
            active={!!htmlPath}
            style={styles.button}
          />
        </View>
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  fileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filePath: {
    flex: 1,
    height: 45,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  filePathText: {
    fontSize: fontSize.sm,
  },
  browseButton: {
    width: 100,
    height: 45,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  infoSection: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    height: 50,
  },
});

export default FilePicker;
