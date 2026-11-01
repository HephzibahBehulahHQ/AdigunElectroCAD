import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";

export type TemplateLevel = "Beginner" | "Intermediate" | "Advanced" | "Industrial" | "Expert";

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  level: TemplateLevel;
  description: string;
  document: CircuitDocument;
}

type Scenario = {
  id: string;
  name: string;
  category: string;
  definitions: string[];
  references: string[];
  wires: Array<[number, string, number, string]>;
};

const levels: TemplateLevel[] = ["Beginner", "Intermediate", "Advanced", "Industrial", "Expert"];
const scenarios: Scenario[] = [
  { id: "motor-feeder", name: "Motor feeder", category: "Motor Control", definitions: ["ac-supply", "circuit-breaker", "motor-starter", "induction-motor"], references: ["X1", "Q1", "KM1", "M1"], wires: [[0, "l1-out", 1, "l1-in"], [0, "l2-out", 1, "l2-in"], [0, "l3-out", 1, "l3-in"], [1, "l1-out", 2, "l1-in"], [1, "l2-out", 2, "l2-in"], [1, "l3-out", 2, "l3-in"], [2, "l1-out", 3, "u1"], [2, "l2-out", 3, "v1"], [2, "l3-out", 3, "w1"]] },
  { id: "drive-feeder", name: "Variable-speed drive feeder", category: "Drives", definitions: ["ac-supply", "circuit-breaker", "variable-frequency-drive", "induction-motor"], references: ["X1", "Q1", "U1", "M1"], wires: [[0, "l1-out", 1, "l1-in"], [0, "l2-out", 1, "l2-in"], [0, "l3-out", 1, "l3-in"], [1, "l1-out", 2, "l1-in"], [1, "l2-out", 2, "l2-in"], [1, "l3-out", 2, "l3-in"], [2, "l1-out", 3, "u1"], [2, "l2-out", 3, "v1"], [2, "l3-out", 3, "w1"]] },
  { id: "plc-sensor", name: "PLC sensor and actuator", category: "Automation", definitions: ["proximity-sensor", "plc-digital-io", "solenoid-actuator"], references: ["B1", "PLC1", "Y1"], wires: [[0, "signal", 1, "in-0"], [0, "common", 1, "common"], [1, "out-0", 2, "a1"]] },
  { id: "timed-relay", name: "Timed relay control", category: "Control Circuit", definitions: ["on-delay-timer", "interface-relay", "solenoid-actuator"], references: ["KT1", "K1", "Y1"], wires: [[0, "18", 1, "a1"], [1, "14", 2, "a1"], [0, "a2", 1, "a2"]] },
  { id: "safety-output", name: "Safety relay output", category: "Safety", definitions: ["safety-relay", "feed-through-terminal", "solenoid-actuator"], references: ["KSR1", "X1", "Y1"], wires: [[0, "s11", 1, "1"], [1, "2", 2, "a1"], [0, "a2", 2, "a2"]] },
];

export const templateLibrary: ProjectTemplate[] = Array.from({ length: 500 }, (_, index) => createTemplate(index));

function createTemplate(index: number): ProjectTemplate {
  const scenario = scenarios[index % scenarios.length];
  const ordinal = index + 1;
  const variant = String((index % 32) + 1).padStart(2, "0");
  const components = scenario.definitions.map((definition, componentIndex) => instance(ordinal, componentIndex, `iec.${definition}.${variant}`, scenario.references[componentIndex]));
  const wires = scenario.wires.map(([fromIndex, fromTerminal, toIndex, toTerminal], wireIndex) => wire(ordinal, wireIndex, components[fromIndex].id, fromTerminal, components[toIndex].id, toTerminal));
  const name = `${scenario.name} ${String(ordinal).padStart(3, "0")}`;
  return {
    id: `template-${String(ordinal).padStart(3, "0")}`,
    name,
    category: scenario.category,
    level: levels[index % levels.length],
    description: `Topology-validated ${scenario.category.toLowerCase()} starter template using generic IEC-oriented symbols. No process simulation is assigned.`,
    document: { id: `template-sheet-${String(ordinal).padStart(3, "0")}`, name, description: `Loaded project template: ${name}.`, components, wires, revision: 1 },
  };
}

function instance(templateNumber: number, index: number, definitionId: string, reference: string): ComponentInstance {
  return { id: `t${templateNumber}-c${index + 1}`, definitionId, reference, x: 170 + index * 220, y: 390, rotation: 0, properties: {} };
}

function wire(templateNumber: number, index: number, fromComponentId: string, fromTerminalId: string, toComponentId: string, toTerminalId: string): Wire {
  return { id: `t${templateNumber}-w${index + 1}`, from: { componentId: fromComponentId, terminalId: fromTerminalId }, to: { componentId: toComponentId, terminalId: toTerminalId }, points: [], netName: `T${templateNumber}_N${index + 1}` };
}
