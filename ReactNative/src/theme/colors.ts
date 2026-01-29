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

  // États des colonnes/composants
  bgValidated: string;      // Vert - colonne validée
  bgHidden: string;         // Jaune - colonne masquée
  bgHighlighted: string;    // Bleu - surligné via double-tap

  // Texte
  textPrimary: string;
  textSecondary: string;
  textOnValidated: string;  // Texte sur fond vert
  textOnHidden: string;     // Texte sur fond jaune
  textOnHighlighted: string; // Texte sur fond bleu

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

  // États des colonnes/composants
  bgValidated: '#2d5a2d',     // Vert foncé
  bgHidden: '#808080',        // Gris (masqué)
  bgHighlighted: '#2a4a6a',   // Bleu foncé

  // Texte
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textOnValidated: '#90ee90',  // Vert clair
  textOnHidden: '#ffffff',     // Blanc
  textOnHighlighted: '#87ceeb', // Bleu clair

  // Bordures
  border: '#808099',
  borderLight: '#4d4d59',

  // PCB - couleurs inspirées de ibom.html mode dark
  pcbBg: '#252C30',       // Fond gris-bleu foncé
  pcbBoard: '#1A3020',    // PCB vert foncé (solder mask)
  pcbPad: '#878787',      // Pads gris
  pcbCompFront: '#cc3333',
  pcbCompBack: '#3333cc',
  pcbSelected: '#ff8000',
  pcbHighlight: '#D04040',

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

  // États des colonnes/composants
  bgValidated: '#c8e6c9',     // Vert pâle
  bgHidden: '#fff9c4',        // Jaune pâle
  bgHighlighted: '#bbdefb',   // Bleu pâle

  // Texte
  textPrimary: '#000000',
  textSecondary: '#4d4d4d',
  textOnValidated: '#1b5e20',  // Vert foncé
  textOnHidden: '#f57f17',     // Orange/jaune foncé
  textOnHighlighted: '#0d47a1', // Bleu foncé

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
