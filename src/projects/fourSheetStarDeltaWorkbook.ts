import { catalogById } from "../catalog/dolCatalog";
import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createWiredStarDeltaCircuit } from "./wiredStarDeltaCircuit";

const pageSpecs = [
  { id: "star-delta-supply", name: "Supply", title: "Three-phase supply and breaker", componentIds: ["supply", "breaker"] },
  { id: "star-delta-power", name: "Motor power", title: "Starter contactors, overload and motor", componentIds: ["forward", "star", "delta", "overload", "motor", "star-point"] },
  { id: "star-delta-control", name: "Control", title: "24 V control supply and timers", componentIds: ["control", "control-psu", "star-timer", "transition-timer"] },
  { id: "star-delta-station", name: "Operator station", title: "START and STOP station", componentIds: ["stop", "start"] },
] as const;

const positions: Record<string, { x: number; y: number }> = {
  supply: { x: 180, y: 220 }, breaker: { x: 520, y: 220 },
  forward: { x: 270, y: 190 }, star: { x: 220, y: 440 }, delta: { x: 520, y: 440 },
  overload: { x: 270, y: 340 }, motor: { x: 620, y: 620 }, "star-point": { x: 820, y: 440 },
  control: { x: 180, y: 180 }, "control-psu": { x: 480, y: 180 },
  "star-timer": { x: 360, y: 420 }, "transition-timer": { x: 700, y: 420 },
  stop: { x: 220, y: 280 }, start: { x: 540, y: 280 },
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
  const terminalLabel = wire.from.terminalId.replace(/^aux-/, "");
  return source ? `${source.reference}.${terminalLabel}` : wire.netName ?? wire.id;
}

/** Four-sheet, source-backed open-transition star/delta workbook with real cross-sheet nets. */
export function createFourSheetStarDeltaWorkbook(): ElectricalProject {
  const base = createWiredStarDeltaCircuit();
  const components = new Map(base.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const componentsByPage = new Map<string, typeof base.components>();
  const sheetDocuments = new Map<string, CircuitDocument>();

  for (const page of pageSpecs) {
    const pageComponents = page.componentIds.map((id) => {
      const component = components.get(id);
      if (!component) throw new Error(`The star/delta example is missing component ${id}.`);
      sheetByComponent.set(id, page.id);
      const position = positions[id];
      return { ...component, x: position.x, y: position.y, properties: { ...component.properties } };
    });
    componentsByPage.set(page.id, pageComponents);
    sheetDocuments.set(page.id, {
      id: page.id,
      name: page.title,
      description: `Sourced star/delta workbook page: ${page.title}. Cross-sheet labels point to actual terminal grid positions on connected pages.`,
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
    const fromDocument = sheetDocuments.get(fromSheetId)!;
    const toDocument = sheetDocuments.get(toSheetId)!;
    const source = components.get(sourceWire.from.componentId)!;
    const terminal = catalogById.get(source.definitionId)?.terminals.find((item) => item.id === sourceWire.from.terminalId);
    const conductorColor = terminal?.kind === "protective-earth" ? earthColor : terminal?.kind === "control" ? controlColor : phaseColor;
    continuations.push({
      id: `star-delta-${sourceWire.id}`,
      label: continuationLabel(sourceWire, components),
      conductorColor,
      points: [
        { sheetId: fromSheetId, gridReference: terminalGridReference(fromDocument, sourceWire.from), role: "source", endpoint: { ...sourceWire.from } },
        { sheetId: toSheetId, gridReference: terminalGridReference(toDocument, sourceWire.to), role: "destination", endpoint: { ...sourceWire.to } },
      ],
    });
  }

  const sheets: CircuitSheet[] = pageSpecs.map((page) => {
    const document = sheetDocuments.get(page.id)!;
    document.wires = localWires.get(page.id)!;
    return { id: page.id, name: page.name, kind: "free-schematic", document };
  });
  return {
    id: "four-sheet-star-delta-starter",
    name: "Four-sheet open-transition star–delta starter",
    description: "Source-backed 7.5 kW, 400 V, six-terminal motor starter. The four sheets separate supply, motor power, timer/control wiring, and operator controls. Cross-sheet continuations preserve labeled terminal-to-terminal nets.",
    revision: 1,
    sheets,
    continuations,
  };
}
