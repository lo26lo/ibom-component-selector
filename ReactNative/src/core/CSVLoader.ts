/**
 * CSVLoader - Charge les fichiers CSV LCSC
 */

import type { LCSCData } from './types';

/**
 * Normalise une valeur de composant pour uniformiser les notations ohm.
 * Gère: Ω, ohm, Ohm, OHM, R (comme suffixe)
 */
export function normalizeValue(value: string): string {
  if (!value) return '';
  
  let normalized = value.trim();
  
  // Remplacer toutes les variantes de ohm par rien
  // Ω (symbole unicode), Ω (ohm symbol), ohm, Ohm, OHM
  normalized = normalized.replace(/[ΩΩ]/g, '');
  normalized = normalized.replace(/\s*[Oo][Hh][Mm]\s*/g, '');
  
  // Gérer le cas "100R" -> "100" (R comme suffixe pour les résistances)
  // Mais attention à ne pas toucher "R1" (référence) ou "4R7" (notation européenne)
  if (/^\d+R$/i.test(normalized)) {
    normalized = normalized.replace(/R$/i, '');
  }
  // Notation européenne: 4R7 -> 4.7
  if (/^\d+R\d+$/i.test(normalized)) {
    normalized = normalized.replace(/R/i, '.');
  }
  
  // Supprimer les espaces superflus
  normalized = normalized.replace(/\s+/g, '').trim();
  
  // Uniformiser la casse des multiplicateurs (K -> k)
  normalized = normalized.replace(/K/g, 'k');
  
  return normalized;
}

/**
 * Compare deux valeurs de composants de manière normalisée
 */
export function valuesMatch(value1: string, value2: string): boolean {
  return normalizeValue(value1) === normalizeValue(value2);
}

/**
 * Détecte le délimiteur utilisé dans le CSV (tab, virgule, ou point-virgule)
 */
function detectDelimiter(headerLine: string): string {
  // Compter les occurrences de chaque délimiteur potentiel
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  
  console.log(`Délimiteurs détectés - Tab: ${tabCount}, Virgule: ${commaCount}, Point-virgule: ${semicolonCount}`);
  
  // Choisir le délimiteur le plus fréquent
  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
    return '\t';
  } else if (semicolonCount >= commaCount && semicolonCount > 0) {
    return ';';
  }
  return ',';
}

/**
 * Parse un fichier CSV LCSC et retourne les données
 * Format attendu: Comment,Designator,Footprint,LCSC
 * Supporte les délimiteurs: tabulation, virgule, point-virgule
 */
export function parseCSV(csvContent: string): LCSCData {
  const lcscData: LCSCData = {};

  try {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return lcscData;

    // Détecter le délimiteur
    const delimiter = detectDelimiter(lines[0]);
    console.log(`Délimiteur utilisé: "${delimiter === '\t' ? 'TAB' : delimiter}"`);

    // Parser l'en-tête pour trouver les colonnes
    const header = parseCSVLine(lines[0], delimiter);
    console.log('CSV headers:', header);
    
    // Chercher les colonnes Designator et LCSC (insensible à la casse)
    const designatorIndex = header.findIndex(
      (h) => h && h.toLowerCase().trim() === 'designator'
    );
    const lcscIndex = header.findIndex(
      (h) => h && h.toLowerCase().trim() === 'lcsc'
    );

    console.log(`Designator index: ${designatorIndex}, LCSC index: ${lcscIndex}`);

    if (designatorIndex === -1 || lcscIndex === -1) {
      console.warn('Colonnes Designator ou LCSC non trouvées dans le CSV');
      console.warn('Headers trouvés:', header);
      return lcscData;
    }

    // Parser les lignes de données
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, delimiter);
      const designators = values[designatorIndex] || '';
      const lcscCode = (values[lcscIndex] || '').trim();

      if (lcscCode) {
        // Les designators peuvent être séparés par des virgules (format LCSC)
        // mais ils sont déjà dans des guillemets donc parseCSVLine les gère
        for (const ref of designators.split(',')) {
          const trimmedRef = ref.trim();
          if (trimmedRef) {
            lcscData[trimmedRef] = lcscCode;
          }
        }
      }
    }

    console.log(`CSV LCSC chargé: ${Object.keys(lcscData).length} références`);
    // Log quelques exemples
    const examples = Object.entries(lcscData).slice(0, 5);
    console.log('Exemples LCSC:', examples);
  } catch (error) {
    console.error('Erreur lors du parsing CSV:', error);
  }

  return lcscData;
}

/**
 * Parse une ligne CSV en gérant les guillemets
 * @param line La ligne à parser
 * @param delimiter Le délimiteur à utiliser (par défaut: virgule)
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Double guillemet = guillemet échappé
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Génère un CSV standard à partir des composants
 */
export function generateCSV(
  components: Array<{
    ref: string;
    value: string;
    footprint: string;
    lcsc: string;
  }>
): string {
  const lines: string[] = [];
  
  // En-tête
  lines.push('Qty,Designator,Value,Footprint,LCSC');

  // Grouper par valeur+footprint+lcsc
  const grouped: Map<
    string,
    { refs: string[]; value: string; footprint: string; lcsc: string }
  > = new Map();

  for (const comp of components) {
    const key = `${comp.value}|${comp.footprint}|${comp.lcsc}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        refs: [],
        value: comp.value,
        footprint: comp.footprint,
        lcsc: comp.lcsc,
      });
    }
    grouped.get(key)!.refs.push(comp.ref);
  }

  // Générer les lignes
  for (const data of grouped.values()) {
    const qty = data.refs.length;
    const designator = data.refs.join(', ');
    lines.push(
      `${qty},"${designator}","${data.value}","${data.footprint}","${data.lcsc}"`
    );
  }

  return lines.join('\n');
}

/**
 * Génère un CSV format LCSC/JLCPCB
 */
export function generateLCSCCSV(
  components: Array<{
    ref: string;
    value: string;
    footprint: string;
    lcsc: string;
  }>
): string {
  const lines: string[] = [];
  
  // En-tête JLCPCB
  lines.push('Comment,Designator,Footprint,LCSC Part Number');

  // Grouper par code LCSC
  const grouped: Map<
    string,
    { refs: string[]; value: string; footprint: string }
  > = new Map();

  for (const comp of components) {
    if (!comp.lcsc) continue; // Ignorer les composants sans code LCSC
    
    if (!grouped.has(comp.lcsc)) {
      grouped.set(comp.lcsc, {
        refs: [],
        value: comp.value,
        footprint: comp.footprint,
      });
    }
    grouped.get(comp.lcsc)!.refs.push(comp.ref);
  }

  // Générer les lignes
  for (const [lcsc, data] of grouped.entries()) {
    const designator = data.refs.join(', ');
    lines.push(
      `"${data.value}","${designator}","${data.footprint}","${lcsc}"`
    );
  }

  return lines.join('\n');
}

export default {
  parseCSV,
  generateCSV,
  generateLCSCCSV,
  normalizeValue,
  valuesMatch,
};
