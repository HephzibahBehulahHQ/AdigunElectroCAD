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
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  properties: Record<string, string | number | boolean>;
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
}

export interface CircuitDocument {
  id: string;
  name: string;
  description: string;
  components: ComponentInstance[];
  wires: Wire[];
  revision: number;
}
