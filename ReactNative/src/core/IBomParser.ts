/**
 * IBomParser - Parse les fichiers HTML InteractiveHtmlBom
 */

import { decompressFromBase64 } from './LZString';
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
      // Chercher les données compressées (format LZ-String)
      const lzMatch = htmlContent.match(
        /LZString\.decompressFromBase64\(["']([^"']+)["']\)/
      );

      if (lzMatch) {
        const compressed = lzMatch[1];
        console.log(`Données compressées trouvées (${compressed.length} chars)`);

        const decompressed = decompressFromBase64(compressed);
        if (decompressed) {
          this.pcbData = JSON.parse(decompressed);
          console.log('Décompression réussie!');
        } else {
          throw new Error('Échec de la décompression des données');
        }
      } else {
        // Essayer le format non compressé
        const pcbMatch = htmlContent.match(
          /var\s+pcbdata\s*=\s*(\{[\s\S]*?\});/
        );
        if (pcbMatch) {
          // Nettoyer le JSON (trailing commas)
          let jsonStr = pcbMatch[1];
          jsonStr = jsonStr.replace(/,\s*}/g, '}');
          jsonStr = jsonStr.replace(/,\s*]/g, ']');
          this.pcbData = JSON.parse(jsonStr);
        } else {
          throw new Error('Données pcbdata non trouvées dans le fichier HTML');
        }
      }

      // Extraire la bounding box
      this.extractBoardBbox();

      // Extraire les composants
      this.extractComponents();

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
   * Ajoute un composant depuis un module
   */
  private addComponentFromModule(module: Module, layer: 'F' | 'B'): void {
    const ref = module.ref || '';
    if (!ref) return;

    const component: Component = {
      ref,
      value: '',
      footprint: '',
      lcsc: this.lcscData[ref] || '',
      layer,
      x: module.center?.[0] || 0,
      y: module.center?.[1] || 0,
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

    const component: Component = {
      ref,
      value: fp.val || '',
      footprint: fp.footprint || '',
      lcsc: this.lcscData[ref] || '',
      layer: fp.layer || 'F',
      x: fp.center?.[0] || 0,
      y: fp.center?.[1] || 0,
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
