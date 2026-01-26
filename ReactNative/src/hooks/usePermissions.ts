/**
 * usePermissions - Hook pour gérer les permissions Android
 */

import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

interface PermissionsState {
  storage: boolean | null;
  checked: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    storage: null,
    checked: false,
  });

  const checkStoragePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setPermissions({ storage: true, checked: true });
      return true;
    }

    try {
      // Android 13+ (API 33+) doesn't need READ_EXTERNAL_STORAGE for document picker
      if (Platform.Version >= 33) {
        setPermissions({ storage: true, checked: true });
        return true;
      }

      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );

      setPermissions({ storage: granted, checked: true });
      return granted;
    } catch (error) {
      console.error('Error checking storage permission:', error);
      setPermissions({ storage: false, checked: true });
      return false;
    }
  }, []);

  const requestStoragePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 13+ uses different permissions model
      if (Platform.Version >= 33) {
        return true;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Permission de stockage',
          message:
            "IBom Selector a besoin d'accéder au stockage pour charger les fichiers HTML et CSV.",
          buttonNeutral: 'Plus tard',
          buttonNegative: 'Annuler',
          buttonPositive: 'Autoriser',
        }
      );

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setPermissions({ storage: granted, checked: true });

      if (!granted) {
        Alert.alert(
          'Permission refusée',
          "L'application ne pourra pas charger de fichiers sans cette permission."
        );
      }

      return granted;
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return false;
    }
  }, []);

  const ensureStoragePermission = useCallback(async (): Promise<boolean> => {
    const hasPermission = await checkStoragePermission();
    if (!hasPermission) {
      return await requestStoragePermission();
    }
    return true;
  }, [checkStoragePermission, requestStoragePermission]);

  return {
    permissions,
    checkStoragePermission,
    requestStoragePermission,
    ensureStoragePermission,
  };
}

export default usePermissions;
