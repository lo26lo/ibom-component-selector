/**
 * Hook pour l'accès au système de fichiers
 */

import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import DocumentPicker, {
  DocumentPickerResponse,
  types,
} from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { useAppStore } from '../store/useAppStore';
import { IBomParser } from '../core/IBomParser';
import { parseCSV } from '../core/CSVLoader';
import type { Component, BoundingBox } from '../core/types';

// Interface pour les données PCB retournées
interface PCBResult {
  path: string;
  components: Component[];
  boardBbox: BoundingBox;
  title?: string;
}

export interface FileSystemHook {
  pickHTMLFile: () => Promise<string | null>;
  pickCSVFile: () => Promise<string | null>;
  loadHTMLFile: (path: string) => Promise<boolean>;
  loadCSVFile: (path: string) => Promise<boolean>;
  pickAndLoadHtml: () => Promise<PCBResult | null>;
  pickAndLoadCsv: () => Promise<{ path: string } | null>;
  saveFile: (filename: string, content: string) => Promise<string | null>;
  requestPermissions: () => Promise<boolean>;
  clearData: () => void;
  loading: boolean;
  progress: number;
  error: string | null;
  pcbData: { components: Component[]; title?: string } | null;
  components: Component[];
}

/**
 * Hook pour la gestion des fichiers
 */
export function useFileSystem(): FileSystemHook {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoadingState] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pcbData, setPcbData] = useState<{ components: Component[]; title?: string } | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  
  const { setParser, setHtmlFilePath, setLcscFilePath, setLoading } = useAppStore();

  /**
   * Demande les permissions de stockage (Android)
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      return (
        granted['android.permission.READ_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  }, []);

  /**
   * Sélectionne un fichier HTML
   */
  const pickHTMLFile = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const result = await DocumentPicker.pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (file.name?.endsWith('.html') || file.name?.endsWith('.htm')) {
        return file.fileCopyUri || file.uri;
      } else {
        setError('Veuillez sélectionner un fichier HTML');
        return null;
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        return null;
      }
      setError('Erreur lors de la sélection du fichier');
      console.error('Pick HTML error:', err);
      return null;
    }
  }, []);

  /**
   * Sélectionne un fichier CSV
   */
  const pickCSVFile = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const result = await DocumentPicker.pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (file.name?.endsWith('.csv')) {
        return file.fileCopyUri || file.uri;
      } else {
        setError('Veuillez sélectionner un fichier CSV');
        return null;
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        return null;
      }
      setError('Erreur lors de la sélection du fichier');
      console.error('Pick CSV error:', err);
      return null;
    }
  }, []);

  /**
   * Charge un fichier HTML IBom
   */
  const loadHTMLFile = useCallback(
    async (path: string): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true, 'Chargement du fichier HTML...');

        // Lire le fichier
        const content = await RNFS.readFile(path, 'utf8');

        // Parser le contenu
        const parser = new IBomParser();
        await parser.parse(content);

        setParser(parser);
        setHtmlFilePath(path);
        setLoading(false);

        return true;
      } catch (err) {
        setError(`Erreur de chargement: ${err}`);
        console.error('Load HTML error:', err);
        setLoading(false);
        return false;
      }
    },
    [setParser, setHtmlFilePath, setLoading]
  );

  /**
   * Charge un fichier CSV LCSC
   */
  const loadCSVFile = useCallback(
    async (path: string): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true, 'Chargement du fichier CSV...');

        const content = await RNFS.readFile(path, 'utf8');
        const lcscData = parseCSV(content);

        const { parser } = useAppStore.getState();
        if (parser) {
          parser.setLCSCData(lcscData);
          setParser(parser); // Rafraîchir
        }

        setLcscFilePath(path);
        setLoading(false);

        return true;
      } catch (err) {
        setError(`Erreur de chargement CSV: ${err}`);
        console.error('Load CSV error:', err);
        setLoading(false);
        return false;
      }
    },
    [setParser, setLcscFilePath, setLoading]
  );

  /**
   * Sauvegarde un fichier
   */
  const saveFile = useCallback(
    async (filename: string, content: string): Promise<string | null> => {
      try {
        setError(null);

        const downloadDir =
          Platform.OS === 'android'
            ? RNFS.DownloadDirectoryPath
            : RNFS.DocumentDirectoryPath;

        const filePath = `${downloadDir}/${filename}`;
        await RNFS.writeFile(filePath, content, 'utf8');

        return filePath;
      } catch (err) {
        setError(`Erreur de sauvegarde: ${err}`);
        console.error('Save file error:', err);
        return null;
      }
    },
    []
  );

  /**
   * Sélectionne et charge un fichier HTML en une seule opération
   */
  const pickAndLoadHtml = useCallback(async (): Promise<PCBResult | null> => {
    try {
      setError(null);
      setLoadingState(true);
      setProgress(10);

      const result = await DocumentPicker.pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (!file.name?.endsWith('.html') && !file.name?.endsWith('.htm')) {
        setError('Veuillez sélectionner un fichier HTML');
        setLoadingState(false);
        return null;
      }

      const path = file.fileCopyUri || file.uri;
      setProgress(30);

      // Lire le fichier
      const content = await RNFS.readFile(path, 'utf8');
      setProgress(50);

      // Parser le contenu
      const parser = new IBomParser();
      await parser.parse(content);
      setProgress(80);

      const comps = parser.getComponents();
      const bbox = parser.getBoardBbox();

      setParser(parser);
      setHtmlFilePath(path);
      setPcbData({ components: comps, title: file.name });
      setComponents(comps);
      setProgress(100);
      setLoadingState(false);

      return { path, components: comps, boardBbox: bbox, title: file.name };
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        setLoadingState(false);
        return null;
      }
      setError(`Erreur: ${err}`);
      console.error('Pick and load HTML error:', err);
      setLoadingState(false);
      return null;
    }
  }, [setParser, setHtmlFilePath]);

  /**
   * Sélectionne et charge un fichier CSV en une seule opération
   */
  const pickAndLoadCsv = useCallback(async (): Promise<{ path: string } | null> => {
    try {
      setError(null);
      setLoadingState(true);
      setProgress(10);

      const result = await DocumentPicker.pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (!file.name?.endsWith('.csv')) {
        setError('Veuillez sélectionner un fichier CSV');
        setLoadingState(false);
        return null;
      }

      const path = file.fileCopyUri || file.uri;
      setProgress(50);

      const content = await RNFS.readFile(path, 'utf8');
      const lcscData = parseCSV(content);
      setProgress(80);

      const { parser } = useAppStore.getState();
      if (parser) {
        parser.setLCSCData(lcscData);
        setParser(parser);
      }

      setLcscFilePath(path);
      setProgress(100);
      setLoadingState(false);

      return { path };
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        setLoadingState(false);
        return null;
      }
      setError(`Erreur: ${err}`);
      console.error('Pick and load CSV error:', err);
      setLoadingState(false);
      return null;
    }
  }, [setParser, setLcscFilePath]);

  /**
   * Efface les données chargées
   */
  const clearData = useCallback(() => {
    setPcbData(null);
    setComponents([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    pickHTMLFile,
    pickCSVFile,
    loadHTMLFile,
    loadCSVFile,
    pickAndLoadHtml,
    pickAndLoadCsv,
    saveFile,
    requestPermissions,
    clearData,
    loading,
    progress,
    error,
    pcbData,
    components,
  };
}

export default useFileSystem;
