import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createVfdFeederProject } from "./vfdFeederProject";

const pages = [
  { id: "vfd-supply", name: "Incoming supply", title: "X1 3-phase supply", component: "supply" },
  { id: "vfd-protection", name: "Feeder breaker", title: "Q1 three-pole breaker", component: "breaker" },
  { id: "vfd-drive", name: "Frequency drive", title: "U1 variable-frequency drive", component: "drive" },
  { id: "vfd-motor", name: "Motor", title: "M1 three-phase motor", component: "motor" },
] as const;

const wireSpecs = [
  ["supply-l1", "L1", "#c02c3a"], ["supply-l2", "L2", "#c99700"], ["supply-l3", "L3", "#356ac3"],
  ["breaker-l1", "L1_VFD", "#c02c3a"], ["breaker-l2", "L2_VFD", "#c99700"], ["breaker-l3", "L3_VFD", "#356ac3"],
  ["drive-u1", "U1_MOTOR", "#c02c3a"], ["drive-v1", "V1_MOTOR", "#c99700"], ["drive-w1", "W1_MOTOR", "#356ac3"],
] as const;

/** Four-page workbook; each conductor retains reciprocal endpoint and grid references. */
export function createFourSheetVfdFeederWorkbook(): ElectricalProject {
  const source = createVfdFeederProject().document;
  const components = new Map(source.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const documents = new Map<string, CircuitDocument>();
  for (const page of pages) {
    const component = components.get(page.component);
    if (!component) throw new Error(`VFD workbook is missing ${page.component}.`);
    sheetByComponent.set(page.component, page.id);
    const localWires = page.id === "vfd-motor" ? source.wires.filter((wire) => wire.id.startsWith("motor-delta-")) : [];
    documents.set(page.id, { id: page.id, name: page.title, description: `VFD feeder sheet: ${page.title}. Follow terminal labels and source/destination grid references to trace the conductor across sheets.`, components: [{ ...component, x: 420, y: 300, properties: { ...component.properties } }], wires: localWires, revision: 1 });
  }
  const byWireId = new Map(source.wires.map((wire) => [wire.id, wire]));
  const continuations: ProjectContinuation[] = wireSpecs.map(([wireId, label, conductorColor]) => {
    const wire = byWireId.get(wireId);
    if (!wire) throw new Error(`VFD feeder wire ${wireId} is missing.`);
    const fromSheet = sheetByComponent.get(wire.from.componentId);
    const toSheet = sheetByComponent.get(wire.to.componentId);
    if (!fromSheet || !toSheet) throw new Error(`VFD feeder wire ${wireId} has no sheet assignment.`);
    return { id: `vfd-${wireId}`, label, conductorColor, points: [
      { sheetId: fromSheet, gridReference: terminalGridReference(documents.get(fromSheet)!, wire.from), role: "source", endpoint: { ...wire.from } },
      { sheetId: toSheet, gridReference: terminalGridReference(documents.get(toSheet)!, wire.to), role: "destination", endpoint: { ...wire.to } },
    ] };
  });
  const peWire = byWireId.get("pe-drive")!;
  const motorPeWire = byWireId.get("pe-motor")!;
  const pePoints = [
    { sheetId: sheetByComponent.get(peWire.from.componentId)!, endpoint: { ...peWire.from } },
    { sheetId: sheetByComponent.get(peWire.to.componentId)!, endpoint: { ...peWire.to } },
    { sheetId: sheetByComponent.get(motorPeWire.to.componentId)!, endpoint: { ...motorPeWire.to } },
  ];
  const pe: ProjectContinuation = {
    id: "vfd-protective-earth", label: "PE", conductorColor: "#16834b",
    points: pePoints.map((point, index) => ({ ...point, gridReference: terminalGridReference(documents.get(point.sheetId)!, point.endpoint), role: index === 0 ? "source" : index === pePoints.length - 1 ? "destination" : "continuation" })),
  };
  const sheets: CircuitSheet[] = pages.map((page) => ({ id: page.id, name: page.name, kind: "free-schematic", document: documents.get(page.id)! }));
  return { id: "four-sheet-vfd-motor-feeder", name: "Four-sheet variable-frequency-drive motor feeder", description: "Incoming phases, breaker, VFD and motor are separated into four sheets. Phase conductors and PE retain reciprocal source/destination grid references; no product-specific breaker or drive ratings are claimed.", revision: 1, sheets, continuations: [...continuations, pe] };
}

