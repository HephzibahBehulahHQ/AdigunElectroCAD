import { catalogById } from "../catalog/dolCatalog";
import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createTwoMotorSequence } from "./twoMotorSequence";

const pageSpecs = [
  { id: "two-motor-supply", name: "Supply", title: "Three-phase source and shared breaker", components: ["supply", "breaker"] },
  { id: "two-motor-power", name: "Motor feeders", title: "Two contactor, overload and motor feeders", components: ["km1", "km2", "f1", "f2", "m1", "m2"] },
  { id: "two-motor-operator", name: "Operator", title: "START, STOP and PLC inputs", components: ["start", "stop", "plc"] },
  { id: "two-motor-sequence", name: "Sequence logic", title: "Overload logic, timer and motor sequence", components: ["overloads", "master", "fault", "stop-or-fault", "run", "timer", "second"] },
] as const;

const phaseColor = "#c42626";
const controlColor = "#a145c1";
const earthColor = "#1d8f53";

function continuationLabel(wire: Wire, components: Map<string, CircuitDocument["components"][number]>): string {
  const source = components.get(wire.from.componentId);
  const definition = source && catalogById.get(source.definitionId);
  const terminal = definition?.terminals.find((item) => item.id === wire.from.terminalId);
  if (terminal?.kind === "protective-earth" || wire.from.terminalId === "pe") return "PE";
  const phase = wire.from.terminalId.match(/l([123])(?:-|$)/i);
  if (phase) return `L${phase[1]}`;
  if (wire.from.terminalId === "plus-out") return "24V+";
  if (wire.from.terminalId === "zero-out") return "0V";
  return source ? `${source.reference}.${wire.from.terminalId}` : wire.netName ?? wire.id;
}

/** Four-sheet, two-motor starter with actual power and control continuations. */
export function createFourSheetTwoMotorWorkbook(): ElectricalProject {
  const base = createTwoMotorSequence();
  const components = new Map(base.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const sheetDocuments = new Map<string, CircuitDocument>();

  for (const page of pageSpecs) {
    const pageComponents = page.components.map((id) => {
      const component = components.get(id);
      if (!component) throw new Error(`The two-motor example is missing component ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, properties: { ...component.properties } };
    });
    sheetDocuments.set(page.id, {
      id: page.id,
      name: page.title,
      description: `Two-motor sequence page: ${page.title}. Cross-sheet labels identify the connected terminal on the other page.`,
      components: pageComponents,
      wires: [],
      revision: 1,
    });
  }

  const localWires = new Map<string, Wire[]>(pageSpecs.map((page) => [page.id, []]));
  const continuations: ProjectContinuation[] = [];
  for (const sourceWire of base.wires) {
    const fromSheetId = sheetByComponent.get(sourceWire.from.componentId);
    const toSheetId = sheetByComponent.get(sourceWire.to.componentId);
    if (!fromSheetId || !toSheetId) throw new Error(`Wire ${sourceWire.id} references a component without a sheet.`);
    if (fromSheetId === toSheetId) {
      localWires.get(fromSheetId)!.push({ ...sourceWire, from: { ...sourceWire.from }, to: { ...sourceWire.to }, points: sourceWire.points.map((point) => ({ ...point })) });
      continue;
    }
    const source = components.get(sourceWire.from.componentId)!;
    const terminal = catalogById.get(source.definitionId)?.terminals.find((item) => item.id === sourceWire.from.terminalId);
    const conductorColor = terminal?.kind === "protective-earth" ? earthColor : terminal?.kind === "control" ? controlColor : phaseColor;
    continuations.push({
      id: `four-sheet-two-motor-${sourceWire.id}`,
      label: continuationLabel(sourceWire, components),
      conductorColor,
      points: [
        { sheetId: fromSheetId, gridReference: terminalGridReference(sheetDocuments.get(fromSheetId)!, sourceWire.from), role: "source", endpoint: { ...sourceWire.from } },
        { sheetId: toSheetId, gridReference: terminalGridReference(sheetDocuments.get(toSheetId)!, sourceWire.to), role: "destination", endpoint: { ...sourceWire.to } },
      ],
    });
  }

  const sheets: CircuitSheet[] = pageSpecs.map((page) => {
    const document = sheetDocuments.get(page.id)!;
    document.wires = localWires.get(page.id)!;
    return { id: page.id, name: page.name, kind: "free-schematic", document };
  });
  return {
    id: "four-sheet-two-motor-sequence",
    name: "Four-sheet two-motor sequence",
    description: "Two source-backed 7.5 kW DOL motor feeders start in sequence. Shared STOP, overload logic and a wired on-delay timer connect the four sheets through labeled, terminal-backed continuations.",
    revision: 1,
    sheets,
    continuations,
  };
}
