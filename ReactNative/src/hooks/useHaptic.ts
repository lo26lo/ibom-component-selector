/**
 * Hook pour le feedback haptique (vibration)
 */

import { Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { usePreferencesStore } from '../store/usePreferencesStore';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Hook pour déclencher des vibrations
 */
export function useHaptic() {
  const vibrationEnabled = usePreferencesStore((state) => state.vibrationEnabled);

  const trigger = (type: HapticType = 'selection') => {
    if (!vibrationEnabled) return;

    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          break;
        case 'medium':
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          break;
        case 'heavy':
          ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
          break;
        case 'selection':
          ReactNativeHapticFeedback.trigger('selection', hapticOptions);
          break;
        case 'success':
          ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
          break;
        case 'warning':
          ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
          break;
        case 'error':
          ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
          break;
      }
    } else {
      // Android - utiliser les types disponibles
      switch (type) {
        case 'light':
        case 'selection':
          ReactNativeHapticFeedback.trigger('effectClick', hapticOptions);
          break;
        case 'medium':
          ReactNativeHapticFeedback.trigger('effectDoubleClick', hapticOptions);
          break;
        case 'heavy':
        case 'success':
          ReactNativeHapticFeedback.trigger('effectHeavyClick', hapticOptions);
          break;
        case 'warning':
        case 'error':
          ReactNativeHapticFeedback.trigger('effectTick', hapticOptions);
          break;
      }
    }
  };

  return { trigger };
}

export default useHaptic;
