/**
 * LZString - Décompresseur LZ-String pour les données InteractiveHtmlBom
 * Port TypeScript de l'algorithme LZ-String
 */

const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const baseReverseDict: { [key: string]: number } = {};

for (let i = 0; i < keyStr.length; i++) {
  baseReverseDict[keyStr.charAt(i)] = i;
}

/**
 * Décompresse une chaîne encodée en base64 LZ-String
 */
export function decompressFromBase64(compressed: string): string | null {
  if (!compressed || compressed.length === 0) {
    return '';
  }

  try {
    const length = compressed.length;
    const getNextValue = (index: number): number => {
      return baseReverseDict[compressed.charAt(index)] || 0;
    };

    return decompress(length, 32, getNextValue);
  } catch (error) {
    console.error('Erreur de décompression LZ-String:', error);
    return null;
  }
}

/**
 * Algorithme de décompression LZ
 */
function decompress(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number
): string | null {
  const dictionary: { [key: number]: string } = {};
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result: string[] = [];

  let dataVal = getNextValue(0);
  let dataPosition = resetValue;
  let dataIndex = 1;

  // Initialiser le dictionnaire
  for (let i = 0; i < 3; i++) {
    dictionary[i] = String.fromCharCode(i);
  }

  // Lire le premier caractère
  let bits = 0;
  const maxPower = Math.pow(2, 2);
  let power = 1;

  while (power !== maxPower) {
    const resb = dataVal & dataPosition;
    dataPosition >>= 1;
    if (dataPosition === 0) {
      dataPosition = resetValue;
      dataVal = getNextValue(dataIndex++);
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  const next = bits;
  switch (next) {
    case 0:
      bits = 0;
      const maxPower8 = Math.pow(2, 8);
      power = 1;
      while (power !== maxPower8) {
        const resb = dataVal & dataPosition;
        dataPosition >>= 1;
        if (dataPosition === 0) {
          dataPosition = resetValue;
          dataVal = getNextValue(dataIndex++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      const c8 = String.fromCharCode(bits);
      dictionary[dictSize++] = c8;
      entry = c8;
      enlargeIn--;
      break;

    case 1:
      bits = 0;
      const maxPower16 = Math.pow(2, 16);
      power = 1;
      while (power !== maxPower16) {
        const resb = dataVal & dataPosition;
        dataPosition >>= 1;
        if (dataPosition === 0) {
          dataPosition = resetValue;
          dataVal = getNextValue(dataIndex++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      const c16 = String.fromCharCode(bits);
      dictionary[dictSize++] = c16;
      entry = c16;
      enlargeIn--;
      break;

    case 2:
      return '';
  }

  let w = entry;
  result.push(entry);

  // Boucle principale
  while (true) {
    if (dataIndex > length) {
      return '';
    }

    bits = 0;
    const maxPowerLoop = Math.pow(2, numBits);
    power = 1;

    while (power !== maxPowerLoop) {
      const resb = dataVal & dataPosition;
      dataPosition >>= 1;
      if (dataPosition === 0) {
        dataPosition = resetValue;
        dataVal = getNextValue(dataIndex++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    let c = bits;

    switch (c) {
      case 0:
        bits = 0;
        const maxPower8b = Math.pow(2, 8);
        power = 1;
        while (power !== maxPower8b) {
          const resb = dataVal & dataPosition;
          dataPosition >>= 1;
          if (dataPosition === 0) {
            dataPosition = resetValue;
            dataVal = getNextValue(dataIndex++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;

      case 1:
        bits = 0;
        const maxPower16b = Math.pow(2, 16);
        power = 1;
        while (power !== maxPower16b) {
          const resb = dataVal & dataPosition;
          dataPosition >>= 1;
          if (dataPosition === 0) {
            dataPosition = resetValue;
            dataVal = getNextValue(dataIndex++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;

      case 2:
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
  decompressFromBase64,
};
