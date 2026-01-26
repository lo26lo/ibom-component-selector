/**
 * CSVLoader - Charge les fichiers CSV LCSC
 */

import type { LCSCData } from './types';

/**
 * Parse un fichier CSV LCSC et retourne les données
 */
export function parseCSV(csvContent: string): LCSCData {
  const lcscData: LCSCData = {};

  try {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return lcscData;

    // Parser l'en-tête pour trouver les colonnes
    const header = parseCSVLine(lines[0]);
    const designatorIndex = header.findIndex(
      (h) => h.toLowerCase() === 'designator'
    );
    const lcscIndex = header.findIndex(
      (h) => h.toLowerCase() === 'lcsc'
    );

    if (designatorIndex === -1 || lcscIndex === -1) {
      console.warn('Colonnes Designator ou LCSC non trouvées dans le CSV');
      return lcscData;
    }

    // Parser les lignes de données
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const designators = values[designatorIndex] || '';
      const lcscCode = (values[lcscIndex] || '').trim();

      if (lcscCode) {
        // Les designators peuvent être séparés par des virgules
        for (const ref of designators.split(',')) {
          const trimmedRef = ref.trim();
          if (trimmedRef) {
            lcscData[trimmedRef] = lcscCode;
          }
        }
      }
    }

    console.log(`CSV LCSC chargé: ${Object.keys(lcscData).length} références`);
  } catch (error) {
    console.error('Erreur lors du parsing CSV:', error);
  }

  return lcscData;
}

/**
 * Parse une ligne CSV en gérant les guillemets
 */
function parseCSVLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
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
};
