/**
 * Types principaux pour IBom Selector
 */

// Composant électronique
export interface Component {
  ref: string;
  id?: number;  // ID du footprint pour correspondance BOM
  value: string;
  footprint: string;
  lcsc: string;
  layer: 'F' | 'B';
  x: number;
  y: number;
  rotation: number;
  qty: number;
  bbox?: BoundingBox;
  pads?: Pad[];
}

// Composant groupé (par valeur)
export interface GroupedComponent extends Component {
  refs: string[];
  groupKey: string;
}

// Pad d'un composant
export interface Pad {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  shape?: 'rect' | 'circle' | 'oval';
}

// Bounding box
export interface BoundingBox {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

// Données PCB parsées
export interface PCBData {
  edges_bbox: BoundingBox;
  modules?: {
    F?: Module[];
    B?: Module[];
  };
  footprints?: Footprint[];
  drawings?: Drawing[];
  tracks?: Track[];
  zones?: Zone[];
}

// Module (composant sur le PCB)
export interface Module {
  ref: string;
  center: [number, number];
  bbox: BoundingBox;
  pads?: Pad[];
  drawings?: Drawing[];
}

// Footprint
export interface Footprint {
  ref: string;
  center: [number, number];
  bbox?: BoundingBox;
  layer: 'F' | 'B';
  pads?: Pad[];
}

// Dessin (silkscreen, etc.)
export interface Drawing {
  type: 'segment' | 'circle' | 'arc' | 'polygon';
  start?: [number, number];
  end?: [number, number];
  center?: [number, number];
  radius?: number;
  width?: number;
  points?: [number, number][];
}

// Track (piste)
export interface Track {
  start: [number, number];
  end: [number, number];
  width: number;
  layer: string;
}

// Zone (plan de masse, etc.)
export interface Zone {
  polygons: [number, number][][];
  layer: string;
}

// Entrée d'historique
export interface HistoryEntry {
  id: string;
  name: string;
  date: string;
  components: Component[];
  processedItems: string[];
  rect?: [number, number, number, number];
}

// Données LCSC depuis CSV
export interface LCSCData {
  [ref: string]: string; // ref -> code LCSC
}

// Filtres de la liste
export interface ListFilters {
  layer: 'all' | 'F' | 'B';
  status: 'all' | 'pending' | 'done';
  search: string;
  sortColumn: 'ref' | 'value' | 'footprint' | 'lcsc' | 'layer' | 'qty';
  sortReverse: boolean;
  groupByValue: boolean;
}

// Préférences utilisateur
export interface Preferences {
  einkMode: boolean;
  groupByValue: boolean;
  autoHighlight: boolean;
  fontSize: number;
  vibrationEnabled: boolean;
  autoSave: boolean;
  autoSaveMinutes: number;
  showSilkscreen: boolean;
}

// Rectangle de sélection
export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// État du zoom/pan PCB
export interface PCBViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
  zoomFactor: number;
  panX: number;
  panY: number;
}
