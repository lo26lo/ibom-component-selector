/**
 * Thème - Couleurs pour les modes normal et e-ink
 */

export interface ThemeColors {
  // Fonds
  bgPrimary: string;
  bgSecondary: string;
  bgSelected: string;
  bgProcessed: string;
  bgButton: string;
  bgButtonActive: string;

  // Texte
  textPrimary: string;
  textSecondary: string;

  // Bordures
  border: string;
  borderLight: string;

  // PCB
  pcbBg: string;
  pcbBoard: string;
  pcbPad: string;
  pcbCompFront: string;
  pcbCompBack: string;
  pcbSelected: string;
  pcbHighlight: string;

  // Checkbox simulé
  checkboxOn: string;
  checkboxOff: string;
}

/**
 * Thème pour mode normal (écran LCD/OLED)
 */
export const normalTheme: ThemeColors = {
  // Fonds
  bgPrimary: '#262633',
  bgSecondary: '#333340',
  bgSelected: '#80801a',
  bgProcessed: '#66661a',
  bgButton: '#597399',
  bgButtonActive: '#738cb3',

  // Texte
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',

  // Bordures
  border: '#808099',
  borderLight: '#4d4d59',

  // PCB
  pcbBg: '#1f1f26',
  pcbBoard: '#1a4d1a',
  pcbPad: '#b39933',
  pcbCompFront: '#cc3333',
  pcbCompBack: '#3333cc',
  pcbSelected: '#ff8000',
  pcbHighlight: '#ff0000',

  // Checkbox
  checkboxOn: '[X]',
  checkboxOff: '[  ]',
};

/**
 * Thème pour mode e-ink (haut contraste noir/blanc)
 */
export const einkTheme: ThemeColors = {
  // Fonds
  bgPrimary: '#ffffff',
  bgSecondary: '#f2f2f2',
  bgSelected: '#d9d9d9',
  bgProcessed: '#cccccc',
  bgButton: '#e6e6e6',
  bgButtonActive: '#bfbfbf',

  // Texte
  textPrimary: '#000000',
  textSecondary: '#4d4d4d',

  // Bordures
  border: '#000000',
  borderLight: '#808080',

  // PCB
  pcbBg: '#ffffff',
  pcbBoard: '#e6e6e6',
  pcbPad: '#999999',
  pcbCompFront: '#333333',
  pcbCompBack: '#808080',
  pcbSelected: '#000000',
  pcbHighlight: '#000000',

  // Checkbox
  checkboxOn: '[X]',
  checkboxOff: '[  ]',
};

/**
 * Retourne le thème selon le mode
 */
export function getTheme(einkMode: boolean): ThemeColors {
  return einkMode ? einkTheme : normalTheme;
}

export default {
  normalTheme,
  einkTheme,
  getTheme,
};
