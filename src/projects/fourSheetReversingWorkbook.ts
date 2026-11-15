import { catalogById } from "../catalog/dolCatalog";
import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createWiredReversingCircuit } from "./wiredReversingCircuit";

const pageSpecs = [
  { id: "reverse-supply", name: "Supply", title: "Three-phase supply and breaker", components: ["supply", "breaker"] },
  { id: "reverse-power", name: "Reversing power", title: "Forward/reverse contactors and motor", components: ["contactor", "reverse", "overload", "motor"] },
  { id: "reverse-controls", name: "Control", title: "24 V supply, STOP and direction stations", components: ["control", "control-psu", "stop", "start", "reverse-start"] },
  { id: "reverse-indication", name: "Indication", title: "Direction indicator lamps", components: ["lamp-h1", "lamp-h2", "lamp-h3"] },
] as const;

const positions: Record<string, { x: number; y: number }> = {
  supply: { x: 180, y: 220 }, breaker: { x: 520, y: 220 },
  contactor: { x: 200, y: 260 }, reverse: { x: 520, y: 260 }, overload: { x: 360, y: 470 }, motor: { x: 360, y: 680 },
  control: { x: 180, y: 180 }, "control-psu": { x: 500, y: 180 },
  stop: { x: 150, y: 430 }, start: { x: 420, y: 430 }, "reverse-start": { x: 700, y: 430 },
  "lamp-h1": { x: 180, y: 320 }, "lamp-h2": { x: 440, y: 320 }, "lamp-h3": { x: 700, y: 320 },
};

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
  return source ? `${source.reference}.${wire.from.terminalId.replace(/^aux-/, "")}` : wire.netName ?? wire.id;
}

/** Four-sheet, source-backed reversing starter with separate power, control and indications. */
export function createFourSheetReversingWorkbook(): ElectricalProject {
  const base = createWiredReversingCircuit();
  const components = new Map(base.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const sheetDocuments = new Map<string, CircuitDocument>();

  for (const page of pageSpecs) {
    const pageComponents = page.components.map((id) => {
      const component = components.get(id);
      if (!component) throw new Error(`The reversing example is missing component ${id}.`);
      const position = positions[id];
      if (!position) throw new Error(`The reversing example has no placement for component ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, x: position.x, y: position.y, properties: { ...component.properties } };
    });
    sheetDocuments.set(page.id, {
      id: page.id,
      name: page.title,
      description: `Source-backed reversing starter page: ${page.title}. Cross-sheet continuation labels reference the connected terminal positions.`,
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
    if (!fromSheetId || !toSheetId) throw new Error(`Wire ${sourceWire.id} references an unassigned component.`);
    if (fromSheetId === toSheetId) {
      localWires.get(fromSheetId)!.push({ ...sourceWire, from: { ...sourceWire.from }, to: { ...sourceWire.to }, points: sourceWire.points.map((point) => ({ ...point })) });
      continue;
    }
    const source = components.get(sourceWire.from.componentId)!;
    const terminal = catalogById.get(source.definitionId)?.terminals.find((item) => item.id === sourceWire.from.terminalId);
    const conductorColor = terminal?.kind === "protective-earth" ? earthColor : terminal?.kind === "control" ? controlColor : phaseColor;
    continuations.push({
      id: `reversing-${sourceWire.id}`,
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
    id: "four-sheet-reversing-starter",
    name: "Four-sheet forward/reverse motor starter",
    description: "Sourced 7.5 kW, 400 V reversing starter with Siemens 3RT contactors, actual NO holding and opposing NC interlocks, shared STOP and overload, swapped L1/L3 phase outputs, and direction lamps. The four pages carry real labeled terminal continuations.",
    revision: 1,
    sheets,
    continuations,
  };
}
