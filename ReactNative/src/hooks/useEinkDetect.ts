/**
 * Hook pour la détection d'écran e-ink
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { usePreferencesStore } from '../store/usePreferencesStore';

// Liste des fabricants d'appareils e-ink
const EINK_MANUFACTURERS = [
  'onyx',
  'boox',
  'remarkable',
  'amazon',
  'kindle',
  'kobo',
  'rakuten',
  'pocketbook',
  'tolino',
  'bigme',
  'supernote',
  'dasung',
  'hisense',
  'boyue',
  'likebook',
];

/**
 * Détecte si l'appareil est un écran e-ink
 */
export async function detectEinkDevice(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const manufacturer = (await DeviceInfo.getManufacturer()).toLowerCase();
    const model = (await DeviceInfo.getModel()).toLowerCase();
    const brand = (await DeviceInfo.getBrand()).toLowerCase();
    const device = (await DeviceInfo.getDevice()).toLowerCase();

    console.log('Device info:', { manufacturer, model, brand, device });

    for (const einkName of EINK_MANUFACTURERS) {
      if (
        manufacturer.includes(einkName) ||
        model.includes(einkName) ||
        brand.includes(einkName) ||
        device.includes(einkName)
      ) {
        console.log(`E-ink device detected: ${einkName}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error detecting e-ink device:', error);
    return false;
  }
}

/**
 * Hook pour la détection automatique du mode e-ink
 */
export function useEinkDetect(): boolean {
  const [isEink, setIsEink] = useState(false);
  const setEinkMode = usePreferencesStore((state) => state.setEinkMode);
  const currentEinkMode = usePreferencesStore((state) => state.einkMode);

  useEffect(() => {
    detectEinkDevice().then((detected) => {
      setIsEink(detected);
      if (detected && !currentEinkMode) {
        console.log('Auto-enabling e-ink mode');
        setEinkMode(true);
      }
    });
  }, []);

  return isEink;
}

export default useEinkDetect;
