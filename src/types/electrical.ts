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

export type DraftingLineType = "solid" | "dashed" | "dotted";

export interface DraftingStyle {
  draftingColor?: string;
  lineWeight?: number;
  lineType?: DraftingLineType;
}

export interface DraftingLayer extends DraftingStyle {
  id: string;
  name: string;
  hidden?: boolean;
}

export interface DraftingEntity extends DraftingStyle {
  layerId?: string;
}

export interface ComponentInstance extends DraftingEntity {
  id: string;
  definitionId: string;
  reference: string;
  /** Optional user-selected on-sheet instance name; descriptive only. */
  displayName?: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  /** Paint order within the component layer. Older documents use component array order. */
  zIndex?: number;
  /** Relative symbol size. Missing values in older projects render at 100%. */
  size?: number;
  properties: Record<string, string | number | boolean>;
  /** User-selected display labels keyed by stable catalog terminal ID; connectivity is unchanged. */
  terminalLabels?: Record<string, string>;
  /** User-configured terminal set for generic symbol-only components. */
  customTerminals?: TerminalDefinition[];
  /** User-selected relative anchor positions for added generic-symbol terminals. */
  customTerminalOffsets?: Record<string, { x: number; y: number }>;
  /** User-authored drawing geometry, local to this symbol instance's origin. */
  customSymbolGraphics?: UserSymbolGraphic[];
  /** User-defined instance metadata; it does not affect electrical simulation. */
  customProperties?: Record<string, string>;
}

export interface TerminalEndpoint {
  componentId: string;
  terminalId: string;
}

export interface Wire extends DraftingEntity {
  id: string;
  from: TerminalEndpoint;
  to: TerminalEndpoint;
  points: Array<{ x: number; y: number }>;
  netName?: string;
  /** The wire this branch is attached to; absent on ordinary terminal-to-terminal wires. */
  branchOfWireId?: string;
  /** Parent endpoint from which the branch route begins. */
  branchSource?: "from" | "to";
  /** Relative position along the parent wire path, from 0 to 1. */
  branchPosition?: number;
}

export interface SchematicAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  /** User-selected visual size in SVG units; does not affect schematic semantics. */
  fontSize?: number;
  /** User-selected visual rotation in degrees; does not affect schematic semantics. */
  rotation?: number;
  /** User-selected visual text alignment; does not affect schematic semantics. */
  textAnchor?: "start" | "middle" | "end";
  /** User-selected visual font weight; does not affect schematic semantics. */
  fontWeight?: 400 | 600 | 700;
  /** Multiplier for spacing between annotation lines; default 1.2 SVG units per font unit. */
  lineSpacing?: number;
  /** User-selected visual font style; does not affect schematic semantics. */
  fontStyle?: "normal" | "italic";
  /** Optional user-selected background fill for the annotation; absent means transparent. */
  backgroundColor?: string;
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

/** One user-drawn primitive stored relative to a reusable component symbol origin. */
export type UserSymbolGraphic = Omit<SchematicGraphic, "id" | "name">;

export interface DrawingGuide {
  id: string;
  axis: "x" | "y";
  coordinate: number;
  locked: boolean;
  hidden: boolean;
}

export interface CircuitDocument {
  id: string;
  name: string;
  description: string;
  components: ComponentInstance[];
  wires: Wire[];
  annotations?: SchematicAnnotation[];
  graphics?: SchematicGraphic[];
  /** Optional named layers shared by wire and component drafting styles. */
  draftingLayers?: DraftingLayer[];
  guides?: DrawingGuide[];
  printLayout?: import("../cad/printLayout").PrintLayout;
  drawingGrid?: import("../cad/drawingGrid").DrawingGrid;
  revision: number;
}

export type SheetKind = "reference-dol" | "free-schematic";

export interface CircuitSheet {
  id: string;
  name: string;
  kind: SheetKind;
  document: CircuitDocument;
}

export type ProjectContinuationRole = "source" | "continuation" | "destination";

/** A real local terminal carried across sheets by a project-level labelled continuation. */
export interface ProjectContinuationPoint {
  sheetId: string;
  gridReference: string;
  role: ProjectContinuationRole;
  endpoint: TerminalEndpoint;
}

/**
 * An ordered project net. The first point is its original source and remains
 * fixed when sheets are reordered, so page references can still trace to origin.
 */
export interface ProjectContinuation {
  id: string;
  label: string;
  conductorColor: string;
  /** Physical core assignment, independent of the editable net label. */
  cableCore?: { cableId: string; coreId: string };
  points: ProjectContinuationPoint[];
}

export interface ElectricalProject {
  id: string;
  name: string;
  description: string;
  sheets: CircuitSheet[];
  /** Optional for older project files; records nets that continue between sheets. */
  continuations?: ProjectContinuation[];
  revision: number;
}

