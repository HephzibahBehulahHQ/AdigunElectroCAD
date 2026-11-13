export type SimulationSupport = "symbol-only" | "connectivity" | "control-logic" | "numerical" | "validated";
export type TerminalKind = "power" | "control" | "protective-earth";

export interface TerminalDefinition {
  id: string;
  label: string;
  kind: TerminalKind;
  direction: "input" | "output" | "bidirectional";
}

export interface ElectricalComponentDefinition {
  id: string;
  name: string;
  category: string;
  referencePrefix: string;
  description: string;
  symbolId: string;
  terminals: TerminalDefinition[];
  propertiesSchema: Record<string, string | number | boolean>;
  simulationModelId: string;
  simulationSupport: SimulationSupport;
  documentation: string;
  standardsReferences: string[];
}

export interface ComponentInstance {
  id: string;
  definitionId: string;
  reference: string;
  /** Optional user-selected on-sheet instance name; descriptive only. */
  displayName?: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  /** Relative symbol size. Missing values in older projects render at 100%. */
  size?: number;
  /** User-selected schematic ink color; presentation only, with no electrical meaning. */
  draftingColor?: string;
  properties: Record<string, string | number | boolean>;
  /** User-selected display labels keyed by stable catalog terminal ID; connectivity is unchanged. */
  terminalLabels?: Record<string, string>;
  /** User-defined instance metadata; it does not affect electrical simulation. */
  customProperties?: Record<string, string>;
}

export interface TerminalEndpoint {
  componentId: string;
  terminalId: string;
}

export interface Wire {
  id: string;
  from: TerminalEndpoint;
  to: TerminalEndpoint;
  points: Array<{ x: number; y: number }>;
  netName?: string;
  /** User-selected conductor stroke color; presentation only. */
  draftingColor?: string;
}

export interface SchematicAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export type SchematicGraphicKind = "line" | "rectangle" | "ellipse" | "polyline" | "polygon";

export interface SchematicGraphicPoint { x: number; y: number }

/** Visual drafting geometry; it does not represent electrical connectivity. */
export interface SchematicGraphic {
  id: string;
  name: string;
  kind: SchematicGraphicKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Vertices for polylines and polygons; older two-point shapes omit this. */
  points?: SchematicGraphicPoint[];
  color: string;
  fillColor?: string | null;
  strokeWidth: number;
}

export interface CircuitDocument {
  id: string;
  name: string;
  description: string;
  components: ComponentInstance[];
  wires: Wire[];
  annotations?: SchematicAnnotation[];
  graphics?: SchematicGraphic[];
  revision: number;
}

export type SheetKind = "reference-dol" | "free-schematic";

export interface CircuitSheet {
  id: string;
  name: string;
  kind: SheetKind;
  document: CircuitDocument;
}

export interface ElectricalProject {
  id: string;
  name: string;
  description: string;
  sheets: CircuitSheet[];
  revision: number;
}

