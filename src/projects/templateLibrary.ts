import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";

export type TemplateLevel = "Beginner" | "Intermediate" | "Advanced" | "Industrial" | "Expert";

export interface TemplateExpectation {
  reference: string;
  label: string;
  valueIncludes: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  level: TemplateLevel;
  description: string;
  testSequence: string[];
  expectedOutputs: TemplateExpectation[];
  document: CircuitDocument;
}

type Scenario = {
  id: string;
  name: string;
  category: string;
  definitions: string[];
  references: string[];
  wires: Array<[number, string, number, string]>;
  testSequence: (ordinal: number) => string[];
  properties: (ordinal: number) => Array<ComponentInstance["properties"]>;
  expectations: (ordinal: number) => TemplateExpectation[];
};

const levels: TemplateLevel[] = ["Beginner", "Intermediate", "Advanced", "Industrial", "Expert"];
const connectedMotorWires: Scenario["wires"] = [
  [0, "l1-out", 1, "l1-in"], [0, "l2-out", 1, "l2-in"], [0, "l3-out", 1, "l3-in"],
  [1, "l1-out", 2, "l1-in"], [1, "l2-out", 2, "l2-in"], [1, "l3-out", 2, "l3-in"],
  [2, "l1-out", 3, "u1"], [2, "l2-out", 3, "v1"], [2, "l3-out", 3, "w1"],
];

const scenarios: Scenario[] = [
  {
    id: "motor-feeder", name: "Motor feeder", category: "Motor Control",
    definitions: ["ac-supply", "circuit-breaker", "motor-starter", "induction-motor"], references: ["X1", "Q1", "KM1", "M1"], wires: connectedMotorWires,
    testSequence: (ordinal) => [`Enable the ${ordinal % 2 ? "50" : "60"} Hz supply.`, "Close Q1.", "Energize KM1 and confirm M1 reaches its nominal operating point."],
    properties: () => [{ outputEnabled: true }, { closed: true }, { energized: true }, { energized: true }],
    expectations: () => [{ reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED" }, { reference: "KM1", label: "Starter contacts", valueIncludes: "CLOSED" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "rpm" }],
  },
  {
    id: "drive-feeder", name: "Variable-speed drive feeder", category: "Drives",
    definitions: ["ac-supply", "circuit-breaker", "variable-frequency-drive", "induction-motor"], references: ["X1", "Q1", "U1", "M1"], wires: connectedMotorWires,
    testSequence: (ordinal) => ["Enable X1 and close Q1.", `Command U1 to ${25 + (ordinal % 20)} Hz.`, "Confirm the drive output and enabled motor model."],
    properties: (ordinal) => [{ outputEnabled: true }, { closed: true }, { enabled: true, commandHz: 25 + (ordinal % 20) }, { energized: true }],
    expectations: () => [{ reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED" }, { reference: "U1", label: "VFD output", valueIncludes: "Hz" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "rpm" }],
  },
  {
    id: "plc-sensor", name: "PLC sensor and actuator", category: "Automation",
    definitions: ["proximity-sensor", "plc-digital-io", "solenoid-actuator"], references: ["B1", "PLC1", "Y1"], wires: [[0, "signal", 1, "in-0"], [0, "common", 1, "common"], [1, "out-0", 2, "a1"]],
    testSequence: () => ["Present a workpiece at B1.", "Set PLC1 Q0 for the detected condition.", "Confirm Y1 extends to its configured stroke."],
    properties: () => [{ detected: true }, { inputA: true, output: true }, { energized: true }],
    expectations: () => [{ reference: "B1", label: "Sensor output", valueIncludes: "ON" }, { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 ON" }, { reference: "Y1", label: "Actuator position", valueIncludes: "EXTENDED" }],
  },
  {
    id: "timed-relay", name: "Timed relay control", category: "Control Circuit",
    definitions: ["on-delay-timer", "interface-relay", "solenoid-actuator"], references: ["KT1", "K1", "Y1"], wires: [[0, "18", 1, "a1"], [1, "14", 2, "a1"], [0, "a2", 1, "a2"]],
    testSequence: (ordinal) => [`Energize KT1 for ${1 + (ordinal % 5)} seconds.`, "Confirm the timed contact closes.", "Confirm K1 energizes Y1."],
    properties: (ordinal) => [{ energized: true, elapsedSeconds: 1 + (ordinal % 5), delaySeconds: 1 + (ordinal % 5) }, { energized: true }, { energized: true }],
    expectations: () => [{ reference: "KT1", label: "Timer contact", valueIncludes: "CLOSED" }, { reference: "K1", label: "Relay contacts", valueIncludes: "ENERGIZED" }, { reference: "Y1", label: "Actuator position", valueIncludes: "EXTENDED" }],
  },
  {
    id: "safety-output", name: "Safety relay output", category: "Safety",
    definitions: ["safety-relay", "feed-through-terminal", "solenoid-actuator"], references: ["KSR1", "X1", "Y1"], wires: [[0, "s11", 1, "1"], [1, "2", 2, "a1"], [0, "a2", 2, "a2"]],
    testSequence: () => ["Close both safety channels.", "Reset KSR1 and confirm its enable state.", "Confirm Y1 receives the enabled actuator command."],
    properties: () => [{ channelAClosed: true, channelBClosed: true, reset: true }, { continuityClosed: true }, { energized: true }],
    expectations: () => [{ reference: "KSR1", label: "Safety enable", valueIncludes: "ENABLED" }, { reference: "X1", label: "Terminal continuity", valueIncludes: "CONNECTED" }, { reference: "Y1", label: "Actuator position", valueIncludes: "EXTENDED" }],
  },
];

export const templateLibrary: ProjectTemplate[] = Array.from({ length: 500 }, (_, index) => createTemplate(index));

function createTemplate(index: number): ProjectTemplate {
  const scenario = scenarios[index % scenarios.length];
  const ordinal = index + 1;
  const variant = String((index % 32) + 1).padStart(2, "0");
  const componentProperties = scenario.properties(ordinal);
  const components = scenario.definitions.map((definition, componentIndex) => instance(ordinal, componentIndex, `iec.${definition}.${variant}`, scenario.references[componentIndex], componentProperties[componentIndex]));
  const wires = scenario.wires.map(([fromIndex, fromTerminal, toIndex, toTerminal], wireIndex) => wire(ordinal, wireIndex, components[fromIndex].id, fromTerminal, components[toIndex].id, toTerminal));
  const name = `${scenario.name} ${String(ordinal).padStart(3, "0")}`;
  const testSequence = scenario.testSequence(ordinal);
  return {
    id: `template-${String(ordinal).padStart(3, "0")}`,
    name,
    category: scenario.category,
    level: levels[index % levels.length],
    description: `Executable ${scenario.category.toLowerCase()} project with parameterized IEC components. Run the recorded sequence and compare the live component abstractions with the stated outputs.`,
    testSequence,
    expectedOutputs: scenario.expectations(ordinal),
    document: { id: `template-sheet-${String(ordinal).padStart(3, "0")}`, name, description: `Executable template ${name}. Test sequence: ${testSequence.join(" ")}`, components, wires, revision: 1 },
  };
}

function instance(templateNumber: number, index: number, definitionId: string, reference: string, properties: ComponentInstance["properties"]): ComponentInstance {
  return { id: `t${templateNumber}-c${index + 1}`, definitionId, reference, x: 170 + index * 220, y: 390, rotation: 0, properties };
}

function wire(templateNumber: number, index: number, fromComponentId: string, fromTerminalId: string, toComponentId: string, toTerminalId: string): Wire {
  return { id: `t${templateNumber}-w${index + 1}`, from: { componentId: fromComponentId, terminalId: fromTerminalId }, to: { componentId: toComponentId, terminalId: toTerminalId }, points: [], netName: `T${templateNumber}_N${index + 1}` };
}

