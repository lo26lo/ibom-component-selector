/**
 * IBomParser - Parse les fichiers HTML InteractiveHtmlBom
 */

import { decompressFromBase64, decompress } from './LZString';
import type {
  Component,
  PCBData,
  BoundingBox,
  LCSCData,
  Module,
  Pad,
} from './types';

export class IBomParser {
  private htmlContent: string = '';
  private pcbData: PCBData | null = null;
  private components: Component[] = [];
  private lcscData: LCSCData = {};
  private boardBbox: BoundingBox = { minx: 0, miny: 0, maxx: 100, maxy: 100 };

  /**
   * Parse le contenu HTML d'un fichier IBom
   */
  async parse(htmlContent: string): Promise<boolean> {
    this.htmlContent = htmlContent;

    try {
      let parsed = false;
      
      // Méthode 1: Format LZString.decompressFromBase64("...")
      const lzBase64Match = htmlContent.match(
        /LZString\.decompressFromBase64\s*\(\s*["']([^"']+)["']\s*\)/
      );
      
      if (lzBase64Match && !parsed) {
        const compressed = lzBase64Match[1];
        console.log(`Format LZ-Base64 trouvé (${compressed.length} chars)`);
        
        const decompressed = decompressFromBase64(compressed);
        if (decompressed && decompressed.length > 0) {
          try {
            this.pcbData = JSON.parse(decompressed);
            parsed = true;
            console.log('Décompression Base64 réussie!');
          } catch (e) {
            console.warn('JSON parse failed after Base64 decompress:', e);
          }
        }
      }
      
      // Méthode 2: Format avec variable pcbdata directe (JSON non compressé)
      if (!parsed) {
        // Essayer plusieurs patterns pour pcbdata
        const patterns = [
          /var\s+pcbdata\s*=\s*(\{[\s\S]*?\});\s*(?:var|function|<\/script>)/,
          /var\s+pcbdata\s*=\s*(\{[\s\S]*?\});/,
          /pcbdata\s*=\s*(\{[\s\S]*?\});/,
        ];
        
        for (const pattern of patterns) {
          const pcbMatch = htmlContent.match(pattern);
          if (pcbMatch) {
            console.log('Format pcbdata non-compressé trouvé');
            try {
              // Nettoyer le JSON (trailing commas, etc.)
              let jsonStr = pcbMatch[1];
              jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
              jsonStr = jsonStr.replace(/'/g, '"');
              // Gérer les propriétés sans guillemets
              jsonStr = jsonStr.replace(/(\w+):/g, '"$1":');
              jsonStr = jsonStr.replace(/""/g, '"');
              
              this.pcbData = JSON.parse(jsonStr);
              parsed = true;
              console.log('Parsing JSON direct réussi!');
              break;
            } catch (e) {
              console.warn('Pattern matched but JSON parse failed:', e);
            }
          }
        }
      }
      
      // Méthode 3: Chercher dans des scripts encodés
      if (!parsed) {
        // Chercher n'importe quelle chaîne base64 longue qui pourrait être les données
        const base64Pattern = /["']([A-Za-z0-9+/=]{1000,})["']/g;
        let match;
        
        while ((match = base64Pattern.exec(htmlContent)) !== null) {
          const potentialData = match[1];
          console.log(`Essai décompression chaîne base64 (${potentialData.length} chars)`);
          
          const decompressed = decompressFromBase64(potentialData);
          if (decompressed && decompressed.startsWith('{')) {
            try {
              this.pcbData = JSON.parse(decompressed);
              parsed = true;
              console.log('Décompression alternative réussie!');
              break;
            } catch (e) {
              // Continuer à chercher
            }
          }
        }
      }

      if (!parsed || !this.pcbData) {
        throw new Error('Format de fichier IBom non reconnu. Assurez-vous que c\'est un fichier InteractiveHtmlBom valide.');
      }

      // Extraire la bounding box
      this.extractBoardBbox();

      // Extraire les composants
      this.extractComponents();

      // Extraire les données BOM (valeur, footprint, LCSC)
      this.extractBomData();

      return true;
    } catch (error) {
      console.error('Erreur de parsing IBom:', error);
      throw error;
    }
  }

  /**
   * Extrait la bounding box du PCB
   */
  private extractBoardBbox(): void {
    if (!this.pcbData) return;

    if (this.pcbData.edges_bbox) {
      this.boardBbox = this.pcbData.edges_bbox;
    } else if ((this.pcbData as any).board?.edges_bbox) {
      this.boardBbox = (this.pcbData as any).board.edges_bbox;
    }
  }

  /**
   * Extrait les composants du PCB
   */
  private extractComponents(): void {
    if (!this.pcbData) return;

    this.components = [];

    // Format avec modules
    if (this.pcbData.modules) {
      const modules = this.pcbData.modules;
      
      for (const layer of ['F', 'B'] as const) {
        const layerModules = modules[layer] || [];
        for (const module of layerModules) {
          this.addComponentFromModule(module, layer);
        }
      }
    }

    // Format avec footprints
    if (this.pcbData.footprints) {
      for (const fp of this.pcbData.footprints) {
        this.addComponentFromFootprint(fp);
      }
    }

    console.log(`${this.components.length} composants extraits`);
  }

  /**
   * Extrait les données BOM (valeur, footprint, LCSC) et les associe aux composants
   */
  private extractBomData(): void {
    if (!this.pcbData || !this.pcbData.bom) return;

    const bom = this.pcbData.bom as any;
    const fieldsData = bom.fields || {};
    const both = bom.both || [];

    console.log(`Extraction BOM: ${both.length} groupes`);

    for (const group of both) {
      if (!Array.isArray(group)) continue;

      for (const refItem of group) {
        if (!Array.isArray(refItem) || refItem.length < 2) continue;

        const refName = refItem[0];
        const fpId = refItem[1];
        const fpIdStr = String(fpId);

        let value = '';
        let footprintName = '';
        let lcsc = '';

        // Chercher dans fieldsData
        if (fieldsData && typeof fieldsData === 'object') {
          const componentFields = fieldsData[fpIdStr];
          if (Array.isArray(componentFields)) {
            if (componentFields.length >= 1) {
              value = componentFields[0] || '';
            }
            if (componentFields.length >= 2) {
              footprintName = componentFields[1] || '';
            }
            // Chercher LCSC (format Cxxxxxxx)
            for (const fieldVal of componentFields) {
              if (typeof fieldVal === 'string' && fieldVal.length > 1) {
                if (fieldVal.startsWith('C') && /^\d+$/.test(fieldVal.slice(1))) {
                  lcsc = fieldVal;
                  break;
                }
              }
            }
          }
        }

        // Si pas de LCSC trouvé, chercher dans les données LCSC externes
        if (!lcsc && this.lcscData[refName]) {
          lcsc = this.lcscData[refName];
        }

        // Mettre à jour le composant correspondant
        for (const comp of this.components) {
          if (comp.ref === refName) {
            comp.value = value;
            comp.footprint = footprintName;
            if (!comp.lcsc) {
              comp.lcsc = lcsc;
            }
            break;
          }
        }
      }
    }

    console.log('Extraction BOM terminée');
  }

  /**
   * Ajoute un composant depuis un module
   */
  private addComponentFromModule(module: Module, layer: 'F' | 'B'): void {
    const ref = module.ref || '';
    if (!ref) return;

    // Calculer les coordonnées comme dans Kivy
    let x = 0, y = 0;
    const bbox = module.bbox as any;
    
    if (bbox) {
      if (bbox.pos && Array.isArray(bbox.pos) && bbox.pos.length >= 2) {
        // bbox.pos existe
        x = bbox.pos[0];
        y = bbox.pos[1];
      } else if (typeof bbox.minx === 'number' && typeof bbox.maxx === 'number') {
        // Calculer le centre à partir de minx/maxx
        x = (bbox.minx + bbox.maxx) / 2;
        y = (bbox.miny + bbox.maxy) / 2;
      }
    }
    
    // Fallback sur center si disponible
    if (x === 0 && y === 0 && module.center) {
      x = module.center[0] || 0;
      y = module.center[1] || 0;
    }

    const component: Component = {
      ref,
      value: '',
      footprint: '',
      lcsc: this.lcscData[ref] || '',
      layer,
      x,
      y,
      rotation: 0,
      qty: 1,
      bbox: module.bbox,
      pads: module.pads,
    };

    this.components.push(component);
  }

  /**
   * Ajoute un composant depuis un footprint
   */
  private addComponentFromFootprint(fp: any): void {
    const ref = fp.ref || '';
    if (!ref) return;

    // Calculer les coordonnées comme dans Kivy
    let x = 0, y = 0;
    const bbox = fp.bbox;
    
    // Méthode 1: bbox.pos
    if (bbox && bbox.pos && Array.isArray(bbox.pos) && bbox.pos.length >= 2) {
      x = bbox.pos[0];
      y = bbox.pos[1];
    }
    // Méthode 2: center
    else if (fp.center && Array.isArray(fp.center) && fp.center.length >= 2) {
      x = fp.center[0];
      y = fp.center[1];
    }
    // Méthode 3: bbox minx/maxx
    else if (bbox && typeof bbox.minx === 'number') {
      x = (bbox.minx + bbox.maxx) / 2;
      y = (bbox.miny + bbox.maxy) / 2;
    }
    // Méthode 4: moyenne des positions des pads
    else if (fp.pads && Array.isArray(fp.pads) && fp.pads.length > 0) {
      let sumX = 0, sumY = 0;
      for (const pad of fp.pads) {
        if (pad.pos && Array.isArray(pad.pos) && pad.pos.length >= 2) {
          sumX += pad.pos[0];
          sumY += pad.pos[1];
        }
      }
      x = sumX / fp.pads.length;
      y = sumY / fp.pads.length;
    }

    const component: Component = {
      ref,
      value: fp.val || '',
      footprint: fp.footprint || '',
      lcsc: this.lcscData[ref] || '',
      layer: fp.layer || 'F',
      x,
      y,
      rotation: fp.angle || 0,
      qty: 1,
      bbox: fp.bbox,
      pads: fp.pads,
    };

    this.components.push(component);
  }

  /**
   * Définit les données LCSC depuis un fichier CSV
   */
  setLCSCData(lcscData: LCSCData): void {
    this.lcscData = lcscData;
    
    // Mettre à jour les composants existants
    for (const comp of this.components) {
      if (this.lcscData[comp.ref]) {
        comp.lcsc = this.lcscData[comp.ref];
      }
    }
  }

  /**
   * Retourne les composants parsés
   */
  getComponents(): Component[] {
    return this.components;
  }

  /**
   * Retourne la bounding box du PCB
   */
  getBoardBbox(): BoundingBox {
    return this.boardBbox;
  }

  /**
   * Retourne les données PCB brutes
   */
  getPCBData(): PCBData | null {
    return this.pcbData;
  }

  /**
   * Retourne les composants dans une zone donnée
   */
  getComponentsInRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): Component[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return this.components.filter((comp) => {
      return (
        comp.x >= minX &&
        comp.x <= maxX &&
        comp.y >= minY &&
        comp.y <= maxY
      );
    });
  }
}

export default IBomParser;
