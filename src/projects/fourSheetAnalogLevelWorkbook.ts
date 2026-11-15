import { catalogById } from "../catalog/dolCatalog";
import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createAnalogLevelProject } from "./analogLevelProject";

const pageSpecs = [
  { id: "analog-field", name: "Field transmitter", title: "4–20 mA level transmitter", components: ["level"] },
  { id: "analog-conversion", name: "Signal conversion", title: "Analog-to-digital conversion", components: ["adc"] },
  { id: "analog-controller", name: "PLC control", title: "PLC AI0 threshold program", components: ["plc"] },
  { id: "analog-output", name: "Actuator output", title: "PLC output and relay coil", components: ["coil"] },
] as const;

const signalColor = "#a145c1";

/** Four-sheet version of the executable level transmitter → ADC → PLC → coil circuit. */
export function createFourSheetAnalogLevelWorkbook(): ElectricalProject {
  const source = createAnalogLevelProject().document;
  const components = new Map(source.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const sheetDocuments = new Map<string, CircuitDocument>();

  for (const page of pageSpecs) {
    const pageComponents = page.components.map((id) => {
      const component = components.get(id);
      if (!component) throw new Error(`The analog level example is missing component ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, x: 420, y: 300, properties: { ...component.properties } };
    });
    sheetDocuments.set(page.id, {
      id: page.id,
      name: page.title,
      description: `Analog level workbook page: ${page.title}. The labeled terminal continuation identifies the connected signal on the next sheet.`,
      components: pageComponents,
      wires: [],
      revision: 1,
    });
  }

  const continuations: ProjectContinuation[] = source.wires.map((wire: Wire) => {
    const fromSheetId = sheetByComponent.get(wire.from.componentId);
    const toSheetId = sheetByComponent.get(wire.to.componentId);
    if (!fromSheetId || !toSheetId || fromSheetId === toSheetId) throw new Error(`Wire ${wire.id} must connect assigned sheets.`);
    return {
      id: `four-sheet-${wire.id}`,
      label: wire.netName ?? wire.id,
      conductorColor: signalColor,
      points: [
        { sheetId: fromSheetId, gridReference: terminalGridReference(sheetDocuments.get(fromSheetId)!, wire.from), role: "source", endpoint: { ...wire.from } },
        { sheetId: toSheetId, gridReference: terminalGridReference(sheetDocuments.get(toSheetId)!, wire.to), role: "destination", endpoint: { ...wire.to } },
      ],
    };
  });

  const sheets: CircuitSheet[] = pageSpecs.map((page) => ({
    id: page.id,
    name: page.name,
    kind: "free-schematic",
    document: sheetDocuments.get(page.id)!,
  }));
  return {
    id: "four-sheet-analog-level-threshold",
    name: "Four-sheet 4–20 mA level control",
    description: "The existing executable B1 → ADC1 → PLC1 → K1 circuit is split across four sheets. Labeled continuations retain the three wired signal paths; power wiring and transmitter loop behavior remain limited to the source model.",
    revision: 1,
    sheets,
    continuations,
  };
}
