/**
 * LZString - Décompresseur LZ-String pour les données InteractiveHtmlBom
 * Implémentation complète basée sur lz-string original
 * https://github.com/pieroxy/lz-string
 */

// Table de caractères base64
const keyStrBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';

// Cache pour les dictionnaires inversés
const baseReverseDic: { [alphabet: string]: { [char: string]: number } } = {};

function getBaseValue(alphabet: string, character: string): number {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (let i = 0; i < alphabet.length; i++) {
      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
    }
  }
  return baseReverseDic[alphabet][character];
}

/**
 * Décompresse une chaîne encodée en base64 LZ-String
 */
export function decompressFromBase64(input: string): string | null {
  if (input == null || input === '') return '';
  
  try {
    return _decompress(input.length, 32, (index: number) => {
      return getBaseValue(keyStrBase64, input.charAt(index));
    });
  } catch (e) {
    console.error('LZString base64 decompression error:', e);
    return null;
  }
}

/**
 * Décompresse une chaîne encodée en URI-safe base64
 */
export function decompressFromEncodedURIComponent(input: string): string | null {
  if (input == null || input === '') return '';
  
  // Remplacer les espaces par +
  input = input.replace(/ /g, '+');
  
  try {
    return _decompress(input.length, 32, (index: number) => {
      return getBaseValue(keyStrUriSafe, input.charAt(index));
    });
  } catch (e) {
    console.error('LZString URI decompression error:', e);
    return null;
  }
}

/**
 * Décompresse une chaîne UTF16
 */
export function decompressFromUTF16(compressed: string): string | null {
  if (compressed == null || compressed === '') return '';
  
  try {
    return _decompress(compressed.length, 16384, (index: number) => {
      return compressed.charCodeAt(index) - 32;
    });
  } catch (e) {
    console.error('LZString UTF16 decompression error:', e);
    return null;
  }
}

/**
 * Décompresse une chaîne Uint8Array (raw)
 */
export function decompressFromUint8Array(compressed: Uint8Array): string | null {
  if (compressed == null || compressed.length === 0) return '';
  
  try {
    const buf: string[] = new Array(compressed.length / 2);
    for (let i = 0, TotalLen = buf.length; i < TotalLen; i++) {
      buf[i] = String.fromCharCode(compressed[i * 2] * 256 + compressed[i * 2 + 1]);
    }
    return decompress(buf.join(''));
  } catch (e) {
    console.error('LZString Uint8Array decompression error:', e);
    return null;
  }
}

/**
 * Décompresse une chaîne standard
 */
export function decompress(compressed: string | null): string | null {
  if (compressed == null || compressed === '') return '';
  
  try {
    return _decompress(compressed.length, 32768, (index: number) => {
      return compressed.charCodeAt(index);
    });
  } catch (e) {
    console.error('LZString decompress error:', e);
    return null;
  }
}

/**
 * Algorithme de décompression LZ principal
 */
function _decompress(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number
): string | null {
  const dictionary: string[] = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result: string[] = [];
  let w: string;
  let c: number;
  
  let data = {
    val: getNextValue(0),
    position: resetValue,
    index: 1
  };

  // Initialisation du dictionnaire avec 3 entrées réservées
  for (let i = 0; i < 3; i++) {
    dictionary[i] = String(i);
  }

  // Lire les 2 premiers bits pour déterminer le type du premier caractère
  let bits = 0;
  let maxpower = Math.pow(2, 2);
  let power = 1;
  
  while (power !== maxpower) {
    const resb = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) {
      data.position = resetValue;
      data.val = getNextValue(data.index++);
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  switch (bits) {
    case 0:
      // Caractère 8-bit
      bits = 0;
      maxpower = Math.pow(2, 8);
      power = 1;
      while (power !== maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = bits;
      break;
      
    case 1:
      // Caractère 16-bit
      bits = 0;
      maxpower = Math.pow(2, 16);
      power = 1;
      while (power !== maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = bits;
      break;
      
    case 2:
      // Fin de la chaîne
      return '';
      
    default:
      return null;
  }
  
  dictionary[3] = String.fromCharCode(c);
  w = String.fromCharCode(c);
  result.push(w);

  // Boucle principale de décompression
  while (true) {
    if (data.index > length) {
      return '';
    }

    // Lire numBits bits
    bits = 0;
    maxpower = Math.pow(2, numBits);
    power = 1;
    
    while (power !== maxpower) {
      const resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    c = bits;
    
    switch (c) {
      case 0:
        // Nouveau caractère 8-bit
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          const resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;
        
      case 1:
        // Nouveau caractère 16-bit
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          const resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;
        
      case 2:
        // Fin de la chaîne
        return result.join('');
    }

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    if (dictionary[c]) {
      entry = dictionary[c];
    } else {
      if (c === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }
    }
    result.push(entry);

    // Ajouter w + entry[0] au dictionnaire
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    w = entry;
  }
}

export default {
  decompress,
  decompressFromBase64,
  decompressFromUTF16,
  decompressFromUint8Array,
  decompressFromEncodedURIComponent,
};
