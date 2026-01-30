/**
 * QRTransfer - Utilitaires pour transfert d'état via QR code
 * Compatible avec la version PC (Python)
 */

import { Buffer } from 'buffer';
import pako from 'pako';

export interface TransferData {
  version: string;
  type: 'ibom_state';
  timestamp: string;
  file: string | null;
  componentStatus: Record<string, string>;
  summary: {
    total: number;
    validated: number;
    hidden: number;
    highlighted: number;
  };
}

/**
 * Compresse les données pour QR code (JSON -> zlib -> base64)
 * Compatible avec Python: zlib.compress() + base64.b64encode()
 */
export function compressForQR(data: TransferData): string {
  try {
    // Convertir en JSON compact
    const jsonStr = JSON.stringify(data);
    
    // Compresser avec pako (compatible zlib)
    const compressed = pako.deflate(jsonStr, { level: 9 });
    
    // Encoder en base64
    const base64 = Buffer.from(compressed).toString('base64');
    
    return base64;
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Erreur de compression');
  }
}

/**
 * Décompresse les données QR (base64 -> zlib -> JSON)
 * Compatible avec Python: base64.b64decode() + zlib.decompress()
 */
export function decompressFromQR(encoded: string): TransferData {
  try {
    // Nettoyer le code (espaces, retours ligne)
    const cleanCode = encoded.trim().replace(/\s/g, '');
    
    // Décoder base64
    const compressed = Buffer.from(cleanCode, 'base64');
    
    // Décompresser avec pako
    const jsonStr = pako.inflate(compressed, { to: 'string' });
    
    // Parser JSON
    const data = JSON.parse(jsonStr);
    
    return data as TransferData;
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Code invalide ou corrompu');
  }
}

/**
 * Génère un code compact pour les données volumineuses
 * Utilise des abréviations pour réduire la taille
 */
export function compressCompact(componentStatus: Record<string, string>): string {
  // Format compact: { cs: { key: 'v'|'h'|'p' } }
  const compact: Record<string, string> = {};
  
  for (const [key, status] of Object.entries(componentStatus)) {
    compact[key] = status.charAt(0); // 'validated' -> 'v', etc.
  }
  
  const data = {
    t: 'ibom',
    v: '1.0',
    cs: compact,
  };
  
  return compressForQR(data as any);
}

/**
 * Vérifie si un code est valide sans le décompresser complètement
 */
export function isValidCode(encoded: string): boolean {
  try {
    decompressFromQR(encoded);
    return true;
  } catch {
    return false;
  }
}
