/**
 * QRTransferModal - Modal pour exporter/importer l'état via QR code
 * Compatible avec la version PC
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Share,
  ScrollView,
  Clipboard,
} from 'react-native';
import { useTheme } from '../../theme';
import { useSessionStore, useAppStore } from '../../store';
import { useToastContext } from '../../hooks';
import { ThemedModal, ThemedButton } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { compressForQR, decompressFromQR, type TransferData } from '../../core/QRTransfer';

interface QRTransferModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'export' | 'import';

export function QRTransferModal({ visible, onClose }: QRTransferModalProps) {
  const { theme } = useTheme();
  const toast = useToastContext();
  
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [importCode, setImportCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stores
  const componentStatus = useSessionStore((s) => s.componentStatus);
  const setComponentStatus = useSessionStore((s) => s.setComponentStatus);
  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const currentHtmlPath = useAppStore((s) => s.currentHtmlPath);
  
  // Générer les données de transfert
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
  
  // Code compressé pour export
  const exportCode = useMemo(() => {
    if (Object.keys(componentStatus).length === 0) return '';
    return compressForQR(transferData);
  }, [transferData, componentStatus]);
  
  // Stats
  const stats = transferData.summary;
  const hasData = Object.keys(componentStatus).length > 0;
  
  // Partager le code
  const handleShare = useCallback(async () => {
    if (!exportCode) {
      toast.warning('Aucun état à exporter');
      return;
    }
    
    try {
      await Share.share({
        message: exportCode,
        title: 'IBom State Transfer',
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, [exportCode, toast]);
  
  // Copier le code
  const handleCopy = useCallback(() => {
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
  
  // Importer le code
  const handleImport = useCallback(() => {
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
    <ThemedModal visible={visible} onClose={onClose} title="📡 Transfert QR">
      {/* Tabs */}
      <View style={styles.tabBar}>
        <ThemedButton
          title="📤 Exporter"
          onPress={() => setActiveTab('export')}
          active={activeTab === 'export'}
          style={styles.tabButton}
        />
        <ThemedButton
          title="📥 Importer"
          onPress={() => setActiveTab('import')}
          active={activeTab === 'import'}
          style={styles.tabButton}
        />
      </View>
      
      {activeTab === 'export' ? (
        <ScrollView style={styles.content}>
          {/* Stats */}
          <View style={[styles.statsBox, { backgroundColor: theme.bgSecondary }]}>
            <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>
              État à exporter
            </Text>
            <Text style={[styles.statsText, { color: theme.textSecondary }]}>
              ✓ {stats.validated} validés | — {stats.hidden} masqués | ★ {stats.highlighted} surlignés
            </Text>
            <Text style={[styles.statsText, { color: theme.textSecondary }]}>
              Total: {stats.total} composants
            </Text>
          </View>
          
          {hasData ? (
            <>
              {/* Code compressé */}
              <View style={[styles.codeBox, { backgroundColor: theme.bgSecondary }]}>
                <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                  Code ({exportCode.length} caractères)
                </Text>
                <Text 
                  style={[styles.codeText, { color: theme.textPrimary }]}
                  numberOfLines={4}
                  selectable
                >
                  {exportCode}
                </Text>
              </View>
              
              {/* Boutons */}
              <View style={styles.buttonRow}>
                <ThemedButton
                  title="📋 Copier"
                  onPress={handleCopy}
                  style={styles.actionButton}
                />
                <ThemedButton
                  title="📤 Partager"
                  onPress={handleShare}
                  style={styles.actionButton}
                />
              </View>
              
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Copiez ce code et collez-le sur le PC{'\n'}
                (Bouton "📥 QR" → Coller → Importer)
              </Text>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Aucun état à exporter.{'\n'}
              Validez ou masquez des composants d'abord.
            </Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          {/* Import */}
          <Text style={[styles.importTitle, { color: theme.textPrimary }]}>
            Collez le code depuis le PC
          </Text>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Sur le PC: Bouton "📤 QR" → Copier code
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
            placeholder="Collez le code ici..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={6}
          />
          
          <View style={styles.buttonRow}>
            <ThemedButton
              title="📋 Coller"
              onPress={handlePaste}
              style={styles.actionButton}
            />
            <ThemedButton
              title="✓ Importer"
              onPress={handleImport}
              disabled={!importCode.trim() || isProcessing}
              style={[styles.actionButton, { backgroundColor: theme.bgValidated }]}
            />
          </View>
        </ScrollView>
      )}
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
  statsText: {
    fontSize: fontSize.sm,
  },
  codeBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  codeLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  codeText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  helpText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  importTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  importInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    minHeight: 120,
    textAlignVertical: 'top',
    marginVertical: spacing.md,
  },
});

export default QRTransferModal;
