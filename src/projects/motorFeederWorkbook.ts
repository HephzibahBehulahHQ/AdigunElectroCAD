import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import type { CircuitDocument, ComponentInstance, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";

const conductorColors = { L1: "#c42626", L2: "#c42626", L3: "#c42626", PE: "#1d8f53" };
const sourceGridReferences = { L1: "G15", L2: "K15", L3: "G15" };
const breakerGridReferences = { L1: "M8", L2: "O8", L3: "Q8" };

/** Ten purposeful sheets: a three-phase source and nine individually wired motor feeders. */
export function createMotorFeederWorkbook(): ElectricalProject {
  const sourceDocument: CircuitDocument = {
    id: "motor-feeder-distribution",
    name: "Incoming three-phase source",
    description: "400 V / 50 Hz educational source. Source capacity and site-specific upstream protection are not specified.",
    revision: 1,
    components: [{ id: "distribution-source", definitionId: "iec.ac-supply.01", reference: "X1", x: 160, y: 300, rotation: 0, properties: { nominalVoltageV: 400, frequencyHz: 50, outputEnabled: true } }],
    wires: [],
  };
  const sheets = [{ id: "sheet-source", name: "Supply · 9 feeders", kind: "free-schematic" as const, document: sourceDocument }];
  const continuations: ProjectContinuation[] = [];
  const base = createSourcedDolMotorStarter();

  for (let ordinal = 1; ordinal <= 9; ordinal++) {
    const sheetId = `sheet-motor-${ordinal}`;
    const sourceById = new Map(base.components.filter((item) => item.id !== "supply" && !item.id.startsWith("lamp-")).map((item) => [item.id, item]));
    const ids = new Map([...sourceById.keys()].map((id) => [id, `m${ordinal}-${id}`]));
    const references: Record<string, string> = {
      breaker: `Q${ordinal}`, contactor: `KM${ordinal}`, overload: `F${ordinal}`,
      motor: `M${ordinal}`, control: `X${ordinal + 1}`, stop: `S${ordinal}0`,
      start: `S${ordinal}1`,
    };
    const components: ComponentInstance[] = [...sourceById.entries()].map(([oldId, component]) => ({
      ...component,
      id: ids.get(oldId)!,
      reference: references[oldId] ?? component.reference,
      properties: { ...component.properties },
    }));
    const localWires: Wire[] = base.wires
      .filter((wire) => wire.from.componentId !== "supply" && wire.to.componentId !== "supply")
      .map((wire) => ({
        ...wire,
        id: `m${ordinal}-${wire.id}`,
        from: { ...wire.from, componentId: ids.get(wire.from.componentId)! },
        to: { ...wire.to, componentId: ids.get(wire.to.componentId)! },
        points: wire.points.map((point) => ({ ...point })),
      }));
    const document: CircuitDocument = {
      id: `motor-feeder-${ordinal}`,
      name: `Motor feeder M${ordinal}`,
      description: `Three-phase DOL motor branch M${ordinal}: breaker, contactor, thermal overload, stop/start controls, and motor. The source is on sheet 1.`,
      components,
      wires: localWires,
      revision: 1,
    };
    sheets.push({ id: sheetId, name: `M${ordinal} · DOL feeder`, kind: "free-schematic", document });

    const breaker = components.find((component) => component.reference === `Q${ordinal}`)!;
    const motor = components.find((component) => component.reference === `M${ordinal}`)!;
    for (const conductor of ["L1", "L2", "L3"] as const) {
      continuations.push({
        id: `feed-m${ordinal}-${conductor.toLowerCase()}`,
        label: `${conductor} / M${ordinal}`,
        conductorColor: conductorColors[conductor],
        points: [
          { sheetId: "sheet-source", gridReference: sourceGridReferences[conductor], role: "source", endpoint: { componentId: "distribution-source", terminalId: `${conductor.toLowerCase()}-out` } },
          { sheetId, gridReference: breakerGridReferences[conductor], role: "destination", endpoint: { componentId: breaker.id, terminalId: `${conductor.toLowerCase()}-in` } },
        ],
      });
    }
    continuations.push({
      id: `feed-m${ordinal}-pe`,
      label: `PE / M${ordinal}`,
      conductorColor: conductorColors.PE,
      points: [
        { sheetId: "sheet-source", gridReference: "K15", role: "source", endpoint: { componentId: "distribution-source", terminalId: "pe" } },
        { sheetId, gridReference: "AS27", role: "destination", endpoint: { componentId: motor.id, terminalId: "pe" } },
      ],
    });
  }

  return {
    id: "motor-feeder-workbook",
    name: "Nine-motor feeder workbook",
    description: "Ten purposeful sheets: one 400 V / 50 Hz educational source and nine individually wired DOL motor feeders. Red phase and green PE continuation labels connect source terminals to actual breaker and motor terminals. Source capacity and protection coordination are not specified.",
    revision: 1,
    sheets,
    continuations,
  };
}
