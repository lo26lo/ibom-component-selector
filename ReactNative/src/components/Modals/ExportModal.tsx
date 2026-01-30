/**
 * ExportModal - Modal pour exporter les données
 * Inclut l'export QR code pour transfert vers PC
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Share, Platform, ScrollView, TextInput, Clipboard } from 'react-native';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme';
import { useAppStore, useSessionStore } from '../../store';
import { useToastContext } from '../../hooks';
import { ThemedModal, ThemedButton, ThemedToggle } from '../common';
import { generateCSV, generateLCSCCSV } from '../../core/CSVLoader';
import { compressForQR, decompressFromQR, type TransferData } from '../../core/QRTransfer';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'export' | 'qr';

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const { theme } = useTheme();
  const toast = useToastContext();

  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const processedItems = useAppStore((s) => s.processedItems);
  const currentHtmlPath = useAppStore((s) => s.currentHtmlPath);
  
  // Session store pour les statuts
  const componentStatus = useSessionStore((s) => s.componentStatus);
  const setComponentStatus = useSessionStore((s) => s.setComponentStatus);

  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [exportProcessedOnly, setExportProcessedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  // === QR CODE ===
  
  // Générer les données de transfert QR
  const transferData: TransferData = useMemo(() => {
    const validated = Object.values(componentStatus).filter(s => s === 'validated').length;
    const hidden = Object.values(componentStatus).filter(s => s === 'hidden').length;
    const highlighted = Object.values(componentStatus).filter(s => s === 'highlighted').length;
    
    return {
      version: '1.0',
      type: 'ibom_state',
      timestamp: new Date().toISOString(),
      file: currentHtmlPath?.split('/').pop() || null,
      componentStatus: componentStatus,
      summary: {
        total: selectedComponents.length,
        validated,
        hidden,
        highlighted,
      },
    };
  }, [componentStatus, selectedComponents, currentHtmlPath]);
  
  // Code compressé pour export QR
  const exportCode = useMemo(() => {
    if (Object.keys(componentStatus).length === 0) return '';
    return compressForQR(transferData);
  }, [transferData, componentStatus]);
  
  const qrStats = transferData.summary;
  const hasQRData = Object.keys(componentStatus).length > 0;
  
  // Copier le code QR
  const handleCopyCode = useCallback(() => {
    if (!exportCode) return;
    Clipboard.setString(exportCode);
    toast.success('Code copié !');
  }, [exportCode, toast]);
  
  // Coller depuis le presse-papier
  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setImportCode(text);
        toast.info('Code collé');
      }
    } catch (error) {
      console.warn('Paste error:', error);
    }
  }, [toast]);
  
  // Importer le code QR
  const handleImportQR = useCallback(() => {
    if (!importCode.trim()) {
      toast.warning('Collez un code d\'abord');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const data = decompressFromQR(importCode.trim());
      
      // Valider le format
      if (data.type !== 'ibom_state' && (data as any).t !== 'ibom') {
        throw new Error('Format invalide');
      }
      
      // Importer les statuts
      const statusDict = data.componentStatus || (data as any).cs || {};
      let importedCount = 0;
      
      for (const [key, status] of Object.entries(statusDict)) {
        let finalStatus = status as string;
        
        // Convertir les abréviations
        if (finalStatus === 'v') finalStatus = 'validated';
        else if (finalStatus === 'h') finalStatus = 'hidden';
        else if (finalStatus === 'p') finalStatus = 'highlighted';
        
        if (['validated', 'hidden', 'highlighted'].includes(finalStatus)) {
          setComponentStatus(key, finalStatus as any);
          importedCount++;
        }
      }
      
      setIsProcessing(false);
      toast.success(`${importedCount} statuts importés`);
      setImportCode('');
      onClose();
      
    } catch (error: any) {
      setIsProcessing(false);
      Alert.alert('Erreur d\'import', error.message || 'Code invalide');
    }
  }, [importCode, setComponentStatus, toast, onClose]);

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Export / Transfert">
      {/* Tabs */}
      <View style={styles.tabBar}>
        <ThemedButton
          title="📁 Export"
          onPress={() => setActiveTab('export')}
          active={activeTab === 'export'}
          style={styles.tabButton}
        />
        <ThemedButton
          title="📡 QR Transfer"
          onPress={() => setActiveTab('qr')}
          active={activeTab === 'qr'}
          style={styles.tabButton}
        />
      </View>

      {activeTab === 'export' ? (
        <ScrollView style={styles.content}>
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
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          {/* Stats QR */}
          <View style={[styles.statsBox, { backgroundColor: theme.bgSecondary }]}>
            <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>
              État actuel
            </Text>
            <Text style={[styles.qrStatsText, { color: theme.textSecondary }]}>
              ✓ {qrStats.validated} validés | — {qrStats.hidden} masqués | ★ {qrStats.highlighted} surlignés
            </Text>
          </View>

          {hasQRData && exportCode.length <= 2500 ? (
            <>
              {/* QR Code visuel */}
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value={exportCode}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Scannez ce QR depuis le PC
              </Text>
            </>
          ) : hasQRData ? (
            <View style={[styles.statsBox, { backgroundColor: theme.bgHighlighted + '40' }]}>
              <Text style={[styles.codeLabel, { color: theme.bgHighlighted }]}>
                ⚠️ Données trop volumineuses ({exportCode.length} car.)
              </Text>
              <ThemedButton
                title="📋 Copier le code"
                onPress={handleCopyCode}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Aucun état à exporter.{'\n'}
              Validez ou masquez des composants d'abord.
            </Text>
          )}

          {/* Séparateur */}
          <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

          {/* Import */}
          <Text style={[styles.importTitle, { color: theme.textPrimary }]}>
            📥 Importer depuis PC
          </Text>
          <TextInput
            style={[
              styles.importInput,
              {
                backgroundColor: theme.bgSecondary,
                color: theme.textPrimary,
                borderColor: theme.borderLight,
              },
            ]}
            value={importCode}
            onChangeText={setImportCode}
            placeholder="Collez le code du PC ici..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />
          <View style={styles.buttonRow}>
            <ThemedButton
              title="📋 Coller"
              onPress={handlePaste}
              style={styles.actionButton}
            />
            <ThemedButton
              title="✓ Importer"
              onPress={handleImportQR}
              disabled={!importCode.trim() || isProcessing}
              style={[styles.actionButton, { backgroundColor: theme.bgValidated }]}
            />
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <ThemedButton title="Fermer" onPress={onClose} />
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
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
  statsBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  qrStatsText: {
    fontSize: fontSize.sm,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  codeLabel: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  separator: {
    height: 1,
    marginVertical: spacing.lg,
  },
  importTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  importInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

export default ExportModal;
