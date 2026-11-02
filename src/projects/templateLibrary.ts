import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";
import type { CircuitSequenceStep } from "./templateVerification";

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
  operatingSequence?: CircuitSequenceStep[];
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
const profile = (...items: ComponentInstance["properties"][]) => items;
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
    properties: (ordinal) => profile({ outputEnabled: true, frequencyHz: ordinal % 2 ? 50 : 60 }, { closed: true }, { energized: true }, { energized: true }),
    expectations: () => [{ reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED" }, { reference: "KM1", label: "Starter contacts", valueIncludes: "CLOSED" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "rpm" }],
  },
  {
    id: "drive-feeder", name: "Variable-speed drive feeder", category: "Drives",
    definitions: ["ac-supply", "circuit-breaker", "variable-frequency-drive", "induction-motor"], references: ["X1", "Q1", "U1", "M1"], wires: connectedMotorWires,
    testSequence: (ordinal) => ["Enable X1 and close Q1.", `Command U1 to ${25 + (ordinal % 20)} Hz.`, "Confirm the drive output and enabled motor model."],
    properties: (ordinal) => profile({ outputEnabled: true }, { closed: true }, { enabled: true, commandHz: 25 + (ordinal % 20) }, { energized: true }),
    expectations: () => [{ reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED" }, { reference: "U1", label: "VFD output", valueIncludes: "Hz" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "rpm" }],
  },
  {
    id: "plc-sensor", name: "PLC sensor and actuator", category: "Automation",
    definitions: ["proximity-sensor", "plc-digital-io", "solenoid-actuator"], references: ["B1", "PLC1", "Y1"], wires: [[0, "signal", 1, "in-0"], [0, "common", 1, "common"], [1, "out-0", 2, "a1"]],
    testSequence: () => ["Press Run with B1 detected to execute the holding program.", "Clear Live Detected at B1; Q0 must remain ON.", "Set PLC1 Live Input B to stop, then release it; Q0 must remain OFF until B1 detects again."],
    properties: () => profile({ detected: true }, { inputA: false, inputB: false, output: false, program: "LD I0; OR Q0; ANDN I1; OUT Q0" }, { energized: false, returnSpring: true }),
    expectations: () => [{ reference: "B1", label: "Sensor output", valueIncludes: "ON" }, { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 OFF" }, { reference: "Y1", label: "Actuator position", valueIncludes: "RETRACTED" }],
  },
  {
    id: "timed-relay", name: "Timed relay control", category: "Control Circuit",
    definitions: ["on-delay-timer", "interface-relay", "solenoid-actuator"], references: ["KT1", "K1", "Y1"], wires: [[0, "18", 1, "a1"], [1, "14", 2, "a1"], [0, "a2", 1, "a2"]],
    testSequence: (ordinal) => [`Energize KT1 for ${1 + (ordinal % 5)} seconds.`, "Confirm the timed contact closes.", "Confirm K1 energizes Y1."],
    properties: (ordinal) => profile({ energized: true, elapsedSeconds: 1 + (ordinal % 5), delaySeconds: 1 + (ordinal % 5) }, { energized: true }, { energized: true }),
    expectations: () => [{ reference: "KT1", label: "Timer contact", valueIncludes: "CLOSED" }, { reference: "K1", label: "Relay contacts", valueIncludes: "ENERGIZED" }, { reference: "Y1", label: "Actuator position", valueIncludes: "EXTENDED" }],
  },
  {
    id: "safety-output", name: "Safety relay output", category: "Safety",
    definitions: ["safety-relay", "feed-through-terminal", "solenoid-actuator"], references: ["KSR1", "X1", "Y1"], wires: [[0, "14", 1, "1"], [1, "2", 2, "a1"], [0, "a2", 2, "a2"]],
    testSequence: () => ["Run with both channels healthy and Live Reset released.", "Press Live Reset, then release it; Y1 must remain enabled.", "Open either channel, restore it with reset held, and confirm Y1 stays off until a fresh release/press reset."],
    properties: () => profile({ channelAClosed: true, channelBClosed: true, reset: false }, { continuityClosed: true }, { energized: false, returnSpring: true }),
    expectations: () => [{ reference: "KSR1", label: "Safety enable", valueIncludes: "INHIBITED" }, { reference: "X1", label: "Terminal continuity", valueIncludes: "CONNECTED" }, { reference: "Y1", label: "Actuator position", valueIncludes: "RETRACTED" }],
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
  const motorSequenceSpeed = 1450 * (ordinal % 2 ? 50 : 60) / 50;
  return {
    id: `template-${String(ordinal).padStart(3, "0")}`,
    name,
    category: scenario.category,
    level: levels[index % levels.length],
    description: `Executable ${scenario.category.toLowerCase()} project with parameterized IEC components. Run the recorded sequence and compare the live component abstractions with the stated outputs.`,
    testSequence,
    expectedOutputs: scenario.expectations(ordinal),
    operatingSequence: scenario.id === "motor-feeder" ? [
      { name: "Isolate breaker", changes: [{ reference: "Q1", properties: { closed: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
      { name: "Close breaker and run", changes: [{ reference: "Q1", properties: { closed: true } }, { reference: "M1", properties: { nominalSpeedRpm: 1450 } }], expectations: [{ reference: "M1", label: "Nominal motor point", numeric: motorSequenceSpeed }] },
      { name: "Release starter", changes: [{ reference: "KM1", properties: { energized: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
      { name: "Restore starter", changes: [{ reference: "KM1", properties: { energized: true } }], expectations: [{ reference: "M1", label: "Nominal motor point", numeric: motorSequenceSpeed }] },
    ] : scenario.id === "drive-feeder" ? [
      { name: "Half-frequency run", changes: [{ reference: "U1", properties: { enabled: true, commandHz: 25 } }, { reference: "M1", properties: { nominalSpeedRpm: 1500 } }], expectations: [{ reference: "M1", label: "Nominal motor point", numeric: 750 }] },
      { name: "Full-frequency run", changes: [{ reference: "U1", properties: { commandHz: 50 } }], expectations: [{ reference: "M1", label: "Nominal motor point", numeric: 1500 }] },
      { name: "Zero-frequency stop", changes: [{ reference: "U1", properties: { commandHz: 0 } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
      { name: "Disabled drive", changes: [{ reference: "U1", properties: { enabled: false, commandHz: 25 } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
    ] : scenario.id === "plc-sensor" ? [
      { name: "Sensor clear and output off", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: false } }, { reference: "Y1", properties: { strokeMm: 20 } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 OFF" }, { reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Detect workpiece", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: true } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 ON · I1 OFF · Q0 ON" }, { reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Retain output after sensor clears", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Stop command", durationSeconds: 0.1, changes: [{ reference: "PLC1", properties: { inputB: true } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Release stop without restart", durationSeconds: 0.1, changes: [{ reference: "PLC1", properties: { inputB: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
    ] : scenario.id === "timed-relay" ? [
      { name: "Before delay", durationSeconds: 1, changes: [{ reference: "KT1", properties: { energized: true, delaySeconds: 2, elapsedSeconds: 0 } }, { reference: "Y1", properties: { returnSpring: true } }], expectations: [{ reference: "K1", label: "Relay contacts", exact: "DE-ENERGIZED" }, { reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Delay expires", durationSeconds: 1, changes: [{ reference: "Y1", properties: { strokeMm: 20 } }], expectations: [{ reference: "KT1", label: "Timer contact", exact: "CLOSED" }, { reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Timer de-energized", durationSeconds: 0.1, changes: [{ reference: "KT1", properties: { energized: false } }], expectations: [{ reference: "KT1", label: "Timer contact", exact: "0.0 / 2.0 s" }, { reference: "K1", label: "Relay contacts", exact: "DE-ENERGIZED" }, { reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
    ] : scenario.id === "safety-output" ? [
      { name: "Reset released", durationSeconds: 0.1, changes: [{ reference: "Y1", properties: { strokeMm: 20 } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Accept fresh reset", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { reset: true } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Release reset retains enable", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { reset: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Channel A open", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { channelAClosed: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Restore A with reset held", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { channelAClosed: true, reset: true } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Release reset after recovery", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { reset: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Reset after recovery", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { reset: true } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "EXTENDED 20 mm" }] },
      { name: "Channel B open", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { channelBClosed: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
      { name: "Restore B with reset held", durationSeconds: 0.1, changes: [{ reference: "KSR1", properties: { channelBClosed: true } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
    ] : undefined,
    document: { id: `template-sheet-${String(ordinal).padStart(3, "0")}`, name, description: `Executable template ${name}. Test sequence: ${testSequence.join(" ")}`, components, wires, revision: 1 },
  };
}

function instance(templateNumber: number, index: number, definitionId: string, reference: string, properties: ComponentInstance["properties"]): ComponentInstance {
  return { id: `t${templateNumber}-c${index + 1}`, definitionId, reference, x: 170 + index * 220, y: 390, rotation: 0, properties };
}

function wire(templateNumber: number, index: number, fromComponentId: string, fromTerminalId: string, toComponentId: string, toTerminalId: string): Wire {
  return { id: `t${templateNumber}-w${index + 1}`, from: { componentId: fromComponentId, terminalId: fromTerminalId }, to: { componentId: toComponentId, terminalId: toTerminalId }, points: [], netName: `T${templateNumber}_N${index + 1}` };
}
