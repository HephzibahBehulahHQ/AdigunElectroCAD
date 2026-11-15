import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, CircuitSheet, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";
import { createPlcSensorActuatorProject } from "./plcSensorActuator";

const pages = [
  { id: "plc-sensor-field", name: "Sensor field", title: "B1 proximity sensor", components: ["sensor"] },
  { id: "plc-sensor-scan", name: "PLC scan", title: "PLC1 I0/I1 and Q0 program", components: ["plc"] },
  { id: "plc-sensor-output", name: "Solenoid output", title: "Y1 solenoid actuator", components: ["actuator"] },
] as const;

/** Split the executable sensor/PLC/actuator circuit while preserving its actual terminal nets. */
export function createThreeSheetPlcSensorWorkbook(): ElectricalProject {
  const source = createPlcSensorActuatorProject().document;
  const components = new Map(source.components.map((component) => [component.id, component]));
  const sheetByComponent = new Map<string, string>();
  const documents = new Map<string, CircuitDocument>();

  for (const page of pages) {
    const pageComponents = page.components.map((id) => {
      const component = components.get(id);
      if (!component) throw new Error(`The PLC sensor project is missing component ${id}.`);
      sheetByComponent.set(id, page.id);
      return { ...component, x: 420, y: 300, properties: { ...component.properties } };
    });
    documents.set(page.id, { id: page.id, name: page.title, description: `PLC sensor workbook sheet: ${page.title}. Cross-sheet terminal labels identify the source and destination connection.`, components: pageComponents, wires: [], revision: 1 });
  }

  const labels: Record<string, string> = { "sensor-i0": "SENSOR_I0", "sensor-com": "SENSOR_COM", "plc-q0": "Q0" };
  const continuations: ProjectContinuation[] = source.wires.map((wire: Wire) => {
    const fromSheetId = sheetByComponent.get(wire.from.componentId);
    const toSheetId = sheetByComponent.get(wire.to.componentId);
    const label = labels[wire.id];
    if (!fromSheetId || !toSheetId || !label) throw new Error(`PLC sensor wire ${wire.id} is missing a sheet assignment or continuation label.`);
    return {
      id: `three-sheet-${wire.id}`,
      label,
      conductorColor: "#a145c1",
      points: [
        { sheetId: fromSheetId, gridReference: terminalGridReference(documents.get(fromSheetId)!, wire.from), role: "source", endpoint: { ...wire.from } },
        { sheetId: toSheetId, gridReference: terminalGridReference(documents.get(toSheetId)!, wire.to), role: "destination", endpoint: { ...wire.to } },
      ],
    };
  });

  const sheets: CircuitSheet[] = pages.map((page) => ({ id: page.id, name: page.name, kind: "free-schematic", document: { ...documents.get(page.id)!, wires: [] } }));
  return {
    id: "three-sheet-plc-sensor-solenoid",
    name: "Three-sheet PLC sensor and solenoid control",
    description: "The existing executable B1 → PLC1 → Y1 circuit is split across sensor, PLC scan and actuator sheets. SENSOR_I0, SENSOR_COM and Q0 retain their source and destination references. Device supply wiring and actuator stroke are not modeled; generic ratings remain unset.",
    revision: 1,
    sheets,
    continuations,
  };
}
