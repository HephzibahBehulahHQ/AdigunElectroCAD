import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import { terminalGridReference } from "../cad/terminalAnchors";
import type { CircuitDocument, ComponentInstance, ElectricalProject, ProjectContinuation, Wire } from "../types/electrical";

const conductorColors = { L1: "#c42626", L2: "#d2a000", L3: "#356ac3", PE: "#1d8f53" };
const phases = ["L1", "L2", "L3"] as const;

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
      // Leave room below the breaker for the contactor coil terminals and their routes.
      y: oldId === "breaker" ? 185 : component.y,
      properties: { ...component.properties },
    }));
    if (ordinal === 1) {
      // The first feeder drawing also shows the separate W2 phase junctions.
      components.push(...phases.map<ComponentInstance>((phase, index) => ({
        id: `w2-junction-${phase.toLowerCase()}`, definitionId: "junction.power",
        reference: `XW2-${phase}`, x: 600, y: 100 + index * 100, rotation: 0, properties: {},
      })));
    }
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
    for (const conductor of phases) {
      const junction = { componentId: `w2-junction-${conductor.toLowerCase()}`, terminalId: "node" };
      continuations.push({
        id: `feed-m${ordinal}-${conductor.toLowerCase()}`,
        label: `${conductor} / M${ordinal}`,
        conductorColor: conductorColors[conductor],
        cableCore: { cableId: `W${ordinal}`, coreId: conductor },
        points: [
          { sheetId: "sheet-source", gridReference: terminalGridReference(sourceDocument, { componentId: "distribution-source", terminalId: `${conductor.toLowerCase()}-out` }), role: "source", endpoint: { componentId: "distribution-source", terminalId: `${conductor.toLowerCase()}-out` } },
          ...(ordinal === 2 ? [{
            sheetId: sheets[1].id, gridReference: terminalGridReference(sheets[1].document, junction),
            role: "continuation" as const, endpoint: junction,
          }] : []),
          { sheetId, gridReference: terminalGridReference(document, { componentId: breaker.id, terminalId: `${conductor.toLowerCase()}-in` }), role: "destination", endpoint: { componentId: breaker.id, terminalId: `${conductor.toLowerCase()}-in` } },
        ],
      });
    }
    continuations.push({
      id: `feed-m${ordinal}-pe`,
      label: `PE / M${ordinal}`,
      conductorColor: conductorColors.PE,
      cableCore: { cableId: `W${ordinal}`, coreId: "PE" },
      points: [
        { sheetId: "sheet-source", gridReference: terminalGridReference(sourceDocument, { componentId: "distribution-source", terminalId: "pe" }), role: "source", endpoint: { componentId: "distribution-source", terminalId: "pe" } },
        { sheetId, gridReference: terminalGridReference(document, { componentId: motor.id, terminalId: "pe" }), role: "destination", endpoint: { componentId: motor.id, terminalId: "pe" } },
      ],
    });
  }

  return {
    id: "motor-feeder-workbook",
    name: "Nine-motor feeder workbook",
    description: "One 400 V / 50 Hz educational source and nine individually wired DOL motor feeders. Cables W1–W9 have individually identified phase and PE cores connected to real terminals. Source capacity and protection coordination are not specified.",
    revision: 1,
    sheets,
    continuations,
  };
}

