import type { CircuitDocument, ComponentInstance, ElectricalProject, Wire } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

/** Electrical command/motion abstraction: assumes an available air supply, not a pressure solver. */
export function createPneumaticCircuit(singleActing = false): CircuitDocument {
  const component = (id: string, definitionId: string, reference: string, x: number, y: number, properties: ComponentInstance["properties"]): ComponentInstance => ({ id, definitionId, reference, x, y, rotation: 0, properties });
  const components = [
    component("command-extend", "logic.no-contact", "S1", 100, 160, { input: false }),
    ...(!singleActing ? [component("command-retract", "logic.no-contact", "S2", 100, 340, { input: false })] : []),
    component("valve", singleActing ? "pneumatic.valve-3-2" : "pneumatic.valve-5-2", "YV1", 340, 240, singleActing ? { energized: false } : { extendCoil: false, retractCoil: false, initialPosition: "retract" }),
    component("cylinder", singleActing ? "pneumatic.cylinder-single" : "pneumatic.cylinder-double", "CY1", 560, 240, { positionPercent: 0, direction: "hold", elapsedSeconds: 0, travelSeconds: 4 }),
    component("position", "logic.comparator-greater-than", "G1", 780, 240, { left: 0, right: 75 }),
    component("indicator", "logic.output-coil", "HL1", 1000, 240, { input: false }),
  ];
  const wires: Wire[] = [];
  const connect = (from: string, output: string, to: string, input: string) => wires.push({ id: `pneumatic-wire-${wires.length + 1}`, from: { componentId: from, terminalId: output }, to: { componentId: to, terminalId: input }, points: [] });
  connect("command-extend", "out", "valve", singleActing ? "in" : "in-a");
  if (!singleActing) connect("command-retract", "out", "valve", "in-b");
  connect("valve", "out", "cylinder", "motion");
  connect("cylinder", "out", "position", "in-a");
  connect("position", "out", "indicator", "in");
  return { id: singleActing ? "pneumatic-single" : "pneumatic-double", name: singleActing ? "3/2 valve and spring-return cylinder" : "5/2 bistable valve and double-acting cylinder", description: "Wired commands, retained valve state, constant-rate motion and position threshold feedback. Air supply and load dynamics are assumed.", revision: 1, components, wires };
}

export function createPneumaticProject(singleActing = false): ElectricalProject {
  const document = createPneumaticCircuit(singleActing);
  return { id: `${document.id}-project`, name: document.name, description: document.description, revision: 1, sheets: [{ id: `${document.id}-sheet`, name: document.name, kind: "free-schematic", document }] };
}

export function createPneumaticTemplate(singleActing = false): ProjectTemplate {
  const document = createPneumaticCircuit(singleActing);
  const step = (name: string, durationSeconds: number, changes: CircuitSequenceStep["changes"], position: string): CircuitSequenceStep => ({ name, durationSeconds, changes, expectations: [{ reference: "CY1", label: position.startsWith("ERROR:") ? "Signal fault" : "Cylinder position", exact: position }] });
  const operatingSequence = singleActing ? [
    step("Enable 3/2 coil", 1, [{ reference: "S1", properties: { input: true } }], "25.0%"),
    step("Reach extension end stop", 3, [], "100.0%"),
    step("Drop coil for spring return", 1, [{ reference: "S1", properties: { input: false } }], "75.0%"),
    step("Reach retraction end stop", 3, [], "0.0%"),
  ] : [
    step("Pulse extend coil", 1, [{ reference: "S1", properties: { input: true } }], "25.0%"),
    step("Release coil; spool retains extension", 2, [{ reference: "S1", properties: { input: false } }], "75.0%"),
    step("Reach extension end stop", 1, [], "100.0%"),
    step("Pulse retract coil", 1, [{ reference: "S2", properties: { input: true } }], "75.0%"),
    step("Release coil; spool retains retraction", 1, [{ reference: "S2", properties: { input: false } }], "50.0%"),
    step("Conflicting coils inhibit modeled motion", 1, [{ reference: "S1", properties: { input: true } }, { reference: "S2", properties: { input: true } }], "ERROR: Both valve coils are energized; switching dominance is not modeled."),
    step("Recover retract command", 1, [{ reference: "S1", properties: { input: false } }], "25.0%"),
    step("Retained retract reaches end stop", 1, [{ reference: "S2", properties: { input: false } }], "0.0%"),
  ];
  return { id: document.id, name: document.name, category: "Pneumatic Control", level: singleActing ? "Intermediate" : "Advanced", description: document.description, document, operatingSequence, testSequence: operatingSequence.map((item) => item.name), expectedOutputs: [{ reference: "CY1", label: "Cylinder position", valueIncludes: "0.0%" }, { reference: "YV1", label: "Valve motion command", valueIncludes: "retract" }, { reference: "HL1", label: "Coil", valueIncludes: "OFF" }] };
}
