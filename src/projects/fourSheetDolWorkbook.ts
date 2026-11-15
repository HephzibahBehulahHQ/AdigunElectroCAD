import { catalogById } from "../catalog/dolCatalog";
import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";

const pageSpecs = [
  { id: "dol-page-supply", name: "Supply & breaker", title: "Incoming supply and breaker", componentIds: ["supply", "breaker"] },
  { id: "dol-page-motor", name: "Motor power", title: "Contactor, overload and motor", componentIds: ["contactor", "overload", "motor"] },
  { id: "dol-page-control", name: "Control supply", title: "230 V control supply and 24 V DC PSU", componentIds: ["control", "control-psu"] },
  { id: "dol-page-station", name: "Operator station", title: "STOP and START station", componentIds: ["stop", "start"] },
] as const;

const crossSheetGridReferences: Record<string, [string, string]> = {
  w4: ["S10", "C10"], w5: ["U10", "E10"], w6: ["V10", "G10"],
  w13: ["K16", "W31"],
  w16: ["G12", "C10"], w17: ["G10", "M18"], w18: ["O18", "K10"],
  w20: ["O10", "Q10"], w22: ["Y22", "K12"],
};
const continuationLabels: Record<string, string> = {
  w4: "L1", w5: "L2", w6: "L3", w13: "PE",
  w16: "24V+", w17: "STOP_OK", w18: "OL_OK", w20: "COIL_START", w22: "0V",
};
const phaseColor = "#c42626";
const controlColor = "#a145c1";
const earthColor = "#1d8f53";

/** Four source-backed sheets for a complete DOL starter with cross-sheet wire references. */
export function createFourSheetDolWorkbook(): ElectricalProject {
  const base = createSourcedDolMotorStarter();
  const sheetByComponent = new Map<string, string>();
  const componentsByPage = new Map<string, typeof base.components>();
  for (const page of pageSpecs) {
    const components = page.componentIds.map((id) => {
      const component = base.components.find((item) => item.id === id);
      if (!component) throw new Error(`The sourced DOL example is missing component ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, properties: { ...component.properties } };
    });
    componentsByPage.set(page.id, components);
  }

  const localWires = new Map<string, Wire[]>();
  for (const page of pageSpecs) localWires.set(page.id, []);
  const continuations: ProjectContinuation[] = [];
  const pageOrder = new Map<string, number>(pageSpecs.map((page, index) => [page.id, index]));
  for (const sourceWire of base.wires) {
    const fromSheetId = sheetByComponent.get(sourceWire.from.componentId);
    const toSheetId = sheetByComponent.get(sourceWire.to.componentId);
    if (!fromSheetId || !toSheetId) throw new Error(`Wire ${sourceWire.id} references an unassigned component.`);
    if (fromSheetId === toSheetId) {
      localWires.get(fromSheetId)!.push({ ...sourceWire, from: { ...sourceWire.from }, to: { ...sourceWire.to }, points: sourceWire.points.map((point) => ({ ...point })) });
      continue;
    }
    const refs = crossSheetGridReferences[sourceWire.id];
    if (!refs) throw new Error(`Wire ${sourceWire.id} has no cross-sheet grid references.`);
    const points = [
      { sheetId: fromSheetId, gridReference: refs[0], role: "source" as const, endpoint: { ...sourceWire.from } },
      { sheetId: toSheetId, gridReference: refs[1], role: "destination" as const, endpoint: { ...sourceWire.to } },
    ];
    if (pageOrder.get(fromSheetId)! > pageOrder.get(toSheetId)!) {
      points.reverse();
      points[0].role = "source";
      points[1].role = "destination";
    }
    const fromComponent = base.components.find((item) => item.id === sourceWire.from.componentId)!;
    const definition = catalogById.get(fromComponent.definitionId);
    const terminal = definition?.terminals.find((item) => item.id === sourceWire.from.terminalId);
    const conductorColor = terminal?.kind === "protective-earth" ? earthColor : terminal?.kind === "control" ? controlColor : phaseColor;
    continuations.push({
      id: `four-sheet-${sourceWire.id}`,
      label: continuationLabels[sourceWire.id] ?? sourceWire.netName ?? sourceWire.id,
      conductorColor,
      points,
    });
  }

  const sheets: CircuitSheet[] = pageSpecs.map((page) => {
    const document: CircuitDocument = {
      id: page.id,
      name: page.title,
      description: `Source-backed DOL starter page: ${page.title}. Cross-sheet conductor labels identify connected terminals on the other sheets.`,
      components: componentsByPage.get(page.id)!,
      wires: localWires.get(page.id)!,
      revision: 1,
    };
    return { id: page.id, name: page.name, kind: "free-schematic", document };
  });
  return {
    id: "four-sheet-sourced-dol-starter",
    name: "Four-sheet Siemens DOL starter",
    description: "A complete source-backed DOL motor starter split into supply, motor power, control supply, and operator-station sheets. Every cross-sheet conductor uses a labeled terminal continuation. Siemens device ratings and model limits are documented in the component properties.",
    revision: 1,
    sheets,
    continuations,
  };
}
