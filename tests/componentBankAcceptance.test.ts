import { expect, it } from "vitest";
import { catalogById, componentLibraryCatalog } from "../src/catalog/dolCatalog";
import { createManualWire, findOpenPlacement, moveComponentToGrid, nextComponentReference, transformComponent } from "../src/cad/documentOps";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createBlankProject } from "../src/projects/starterProject";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { CircuitDocument, ComponentInstance, ElectricalComponentDefinition } from "../src/types/electrical";

function place(definition: ElectricalComponentDefinition, document: CircuitDocument, id: string, position: Pick<ComponentInstance, "x" | "y">): ComponentInstance {
  return {
    id, definitionId: definition.id, reference: nextComponentReference(document.components, definition.referencePrefix),
    ...position, rotation: 0, properties: { ...definition.propertiesSchema },
  };
}

it.each(componentLibraryCatalog)("places, transforms, wires and reloads $id", (definition) => {
  const project = createBlankProject();
  const [sheet] = project.sheets;
  const document = sheet.document;
  const position = findOpenPlacement(document.components, "free", definition.id);
  if (!position) throw new Error(`No initial placement for ${definition.id}`);
  const placed = place(definition, document, "device", position);
  document.components.push(placed);
  let wired: CircuitDocument | undefined = definition.terminals.length === 0 ? document : undefined;
  for (const peerDefinition of definition.terminals.length ? componentLibraryCatalog : []) {
    const peer = place(peerDefinition, document, "peer", { x: 800, y: 500 });
    const candidate = { ...document, components: [placed, peer] };
    for (const terminal of definition.terminals) {
      for (const other of peerDefinition.terminals) {
        const from = { componentId: placed.id, terminalId: terminal.id };
        const to = { componentId: peer.id, terminalId: other.id };
        if (canConnectTerminals(candidate, catalogById, from, to).ok) {
          wired = { ...candidate, wires: [createManualWire(candidate, from, to)] };
          break;
        }
      }
      if (wired) break;
    }
    if (wired) break;
  }
  if (!wired) throw new Error(`No compatible bank terminal for ${definition.id}`);

  const moved = moveComponentToGrid(wired, placed.id, 320, 280);
  expect(moved.ok).toBe(true);
  const rotated = transformComponent(moved.document, placed.id, { kind: "rotate", rotation: 90 });
  expect(rotated.ok).toBe(true);
  const resized = transformComponent(rotated.document, placed.id, { kind: "resize", size: 1.15 });
  expect(resized.ok).toBe(true);
  const edited = {
    ...resized.document,
    components: resized.document.components.map((component) => component.id === placed.id ? { ...component, draftingColor: "#1d567c" } : component),
  };
  const restored = parseProjectJson(JSON.stringify({ ...project, sheets: [{ ...sheet, document: edited }] })).sheets[0].document;
  expect(restored.components.find((component) => component.id === placed.id)).toMatchObject({
    definitionId: definition.id, x: 320, y: 280, rotation: 90, size: 1.15, draftingColor: "#1d567c", properties: definition.propertiesSchema,
  });
  expect(validateCircuit(restored, catalogById)).toEqual([]);
  expect(restored.wires.map(({ from, to }) => ({ from, to }))).toEqual(wired.wires.map(({ from, to }) => ({ from, to })));
  expect(terminalAnchors(restored).filter(({ endpoint }) => endpoint.componentId === placed.id).map(({ endpoint }) => endpoint.terminalId)).toEqual(definition.terminals.map(({ id }) => id));
  if (!definition.terminals.length) expect(executeCircuitModels(restored, catalogById)).toEqual([]);
  if (definition.simulationSupport !== "symbol-only") {
    expect(executeCircuitModels(document, catalogById).find(({ componentId }) => componentId === placed.id)?.output).toMatchObject({ label: expect.any(String), value: expect.any(String) });
  }
});

it("runs the selectable educational supply, breaker and motor only when all three paths conduct", () => {
  const document = createBlankProject().sheets[0].document;
  const source = place(catalogById.get("supply.three-phase")!, document, "source", { x: 180, y: 160 });
  const breaker = place(catalogById.get("breaker.three-pole")!, document, "breaker", { x: 180, y: 320 });
  const motor = place(catalogById.get("motor.three-phase")!, document, "motor", { x: 180, y: 560 });
  document.components.push(source, breaker, motor);
  for (const [index, phase] of ["l1", "l2", "l3"].entries()) {
    document.wires.push(createManualWire(document, { componentId: source.id, terminalId: phase }, { componentId: breaker.id, terminalId: `${phase}-in` }));
    document.wires.push(createManualWire(document, { componentId: breaker.id, terminalId: `${phase}-out` }, { componentId: motor.id, terminalId: ["u1", "v1", "w1"][index] }));
  }
  expect(validateCircuit(document, catalogById)).toEqual([]);
  const motorOutput = (circuit: CircuitDocument) => executeCircuitModels(circuit, catalogById).find((run) => run.componentId === motor.id)?.output.value;
  expect(motorOutput(document)).toBe("STANDBY");
  breaker.properties.closed = true;
  expect(motorOutput(document)).toBe("1440 rpm / 7.5 kW");
  expect(motorOutput({ ...document, wires: document.wires.slice(0, -1) })).toContain("unbalanced winding current is unavailable");
});

it("keeps Festo fluid lines isolated from coil wires and switches the documented paths", () => {
  const document = createBlankProject().sheets[0].document;
  const ac = place(catalogById.get("supply.control")!, document, "ac", { x: 100, y: 140 });
  const dc = place(catalogById.get("iec.dc-control-supply.01")!, document, "dc", { x: 280, y: 140 });
  const nc = place(catalogById.get("festo.vovg.560697")!, document, "nc", { x: 480, y: 140 });
  const no = place(catalogById.get("festo.vovg.560699")!, document, "no", { x: 720, y: 140 });
  no.reference = "V2";
  document.components = [ac, dc, nc, no];
  const endpoint = (componentId: string, terminalId: string) => ({ componentId, terminalId });
  const connect = (from: ReturnType<typeof endpoint>, to: ReturnType<typeof endpoint>) => {
    expect(canConnectTerminals(document, catalogById, from, to).ok).toBe(true);
    document.wires.push(createManualWire(document, from, to));
  };
  const paths = () => executeCircuitModels(document, catalogById).filter(run => run.output.label === "Open pneumatic path").map(run => run.output.value);
  expect(paths()).toEqual(["2 ↔ 3", "1 ↔ 2"]);
  expect(canConnectTerminals(document, catalogById, endpoint("nc", "port-2"), endpoint("no", "a1")).ok).toBe(false);
  connect(endpoint("nc", "port-2"), endpoint("no", "port-1"));
  connect(endpoint("ac", "line"), endpoint("dc", "line-in"));
  connect(endpoint("ac", "neutral"), endpoint("dc", "neutral-in"));
  for (const valve of [nc, no]) {
    connect(endpoint("dc", "plus-out"), endpoint(valve.id, "a1"));
    connect(endpoint("dc", "zero-out"), endpoint(valve.id, "a2"));
  }
  expect(paths()).toEqual(["1 ↔ 2", "2 ↔ 3"]);
  expect(validateCircuit(document, catalogById)).toEqual([]);
});
