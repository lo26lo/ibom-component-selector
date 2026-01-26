/**
 * useOrientation - Hook pour détecter l'orientation de l'écran
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type Orientation = 'portrait' | 'landscape';

interface OrientationInfo {
  orientation: Orientation;
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
}

export function useOrientation(): OrientationInfo {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        setDimensions(window);
      }
    );

    return () => subscription?.remove();
  }, []);

  const isLandscape = dimensions.width > dimensions.height;

  return {
    orientation: isLandscape ? 'landscape' : 'portrait',
    width: dimensions.width,
    height: dimensions.height,
    isLandscape,
    isPortrait: !isLandscape,
  };
}

export default useOrientation;
