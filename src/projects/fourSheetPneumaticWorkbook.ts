import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createPneumaticCircuit } from "./pneumaticCircuit";

const pageSpecs = [
  { id: "pneumatic-command", name: "Command station", title: "Extend and retract commands", components: ["command-extend", "command-retract"] },
  { id: "pneumatic-valve", name: "5/2 valve", title: "Bistable 5/2 directional valve", components: ["valve"] },
  { id: "pneumatic-motion", name: "Cylinder motion", title: "Double-acting cylinder", components: ["cylinder"] },
  { id: "pneumatic-feedback", name: "Position feedback", title: "75% position threshold and indicator", components: ["position", "indicator"] },
] as const;

const positions: Record<string, { x: number; y: number }> = {
  "command-extend": { x: 260, y: 220 },
  "command-retract": { x: 260, y: 420 },
  valve: { x: 420, y: 320 },
  cylinder: { x: 420, y: 320 },
  position: { x: 300, y: 320 },
  indicator: { x: 640, y: 320 },
};

const labels: Record<string, string> = {
  "pneumatic-wire-1": "EXTEND_CMD",
  "pneumatic-wire-2": "RETRACT_CMD",
  "pneumatic-wire-3": "VALVE_MOTION",
  "pneumatic-wire-4": "CY1_POS",
  "pneumatic-wire-5": "POS_OK",
};

/** Four-sheet rendering of the connected bistable valve, actuator and position-feedback model. */
export function createFourSheetPneumaticWorkbook(): ElectricalProject {
  const source = createPneumaticCircuit(false);
  const components = new Map(source.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const sheetDocuments = new Map<string, CircuitDocument>();

  for (const page of pageSpecs) {
    const pageComponents = page.components.map((id) => {
      const component = components.get(id);
      const position = positions[id];
      if (!component || !position) throw new Error(`The pneumatic example is missing component or placement ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, x: position.x, y: position.y, properties: { ...component.properties } };
    });
    sheetDocuments.set(page.id, {
      id: page.id,
      name: page.title,
      description: `Electro-pneumatic workbook page: ${page.title}. The labeled terminal continuations identify the connected command or feedback point on other sheets.`,
      components: pageComponents,
      wires: [],
      revision: 1,
    });
  }

  const localWires = new Map<string, Wire[]>(pageSpecs.map((page) => [page.id, []]));
  const continuations: ProjectContinuation[] = [];
  for (const wire of source.wires) {
    const fromSheetId = sheetByComponent.get(wire.from.componentId);
    const toSheetId = sheetByComponent.get(wire.to.componentId);
    const label = labels[wire.id];
    if (!fromSheetId || !toSheetId) throw new Error(`Pneumatic wire ${wire.id} references a component without a sheet.`);
    if (fromSheetId === toSheetId) {
      localWires.get(fromSheetId)!.push({ ...wire, from: { ...wire.from }, to: { ...wire.to }, points: wire.points.map((point) => ({ ...point })) });
      continue;
    }
    if (!label) throw new Error(`Pneumatic wire ${wire.id} is missing a cross-sheet label.`);
    continuations.push({
      id: `four-sheet-${wire.id}`,
      label,
      conductorColor: "#a145c1",
      points: [
        { sheetId: fromSheetId, gridReference: terminalGridReference(sheetDocuments.get(fromSheetId)!, wire.from), role: "source", endpoint: { ...wire.from } },
        { sheetId: toSheetId, gridReference: terminalGridReference(sheetDocuments.get(toSheetId)!, wire.to), role: "destination", endpoint: { ...wire.to } },
      ],
    });
  }

  const sheets: CircuitSheet[] = pageSpecs.map((page) => ({
    id: page.id,
    name: page.name,
    kind: "free-schematic",
    document: { ...sheetDocuments.get(page.id)!, wires: localWires.get(page.id)! },
  }));
  return {
    id: "four-sheet-pneumatic-double-acting",
    name: "Four-sheet double-acting cylinder control",
    description: `${source.description} Four sheets keep the command inputs, valve, cylinder and position feedback readable while terminal continuations preserve their signal paths. Air supply is assumed; the model is not a pressure or flow-network solver.`,
    revision: 1,
    sheets,
    continuations,
  };
}
