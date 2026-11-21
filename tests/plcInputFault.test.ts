import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { validateCircuit } from "../src/electrical/topology";
import type { CircuitDocument } from "../src/types/electrical";

it.each([
  ["level-current", "ADC1"],
  ["adc-raw", "PLC1"],
])("rejects an undriven %s branch and recovers when its source is restored", (wireId, terminalReference) => {
  const design = createAnalogLevelProject().document;
  const original = design.wires.find((wire) => wire.id === wireId)!;
  const adcDefinition = catalogById.get("signal.adc")!;
  const kind = adcDefinition.terminals.find((terminal) => terminal.id === "in")!.kind;
  const passiveDefinition = {
    ...adcDefinition, id: "test.passive-analog-terminal", simulationModelId: "test-passive",
    terminals: [{ id: "node", label: "J", kind, direction: "bidirectional" as const }],
  };
  const catalog = new Map(catalogById).set(passiveDefinition.id, passiveDefinition);
  const junction = { componentId: "junction", terminalId: "node" };
  design.components.push({ id: junction.componentId, reference: "X10", definitionId: passiveDefinition.id, x: 240, y: 480, rotation: 0, properties: {} });
  const transmitter = design.components.find((component) => component.id === "level")!;
  transmitter.properties.levelPercent = 75;
  const sourceWire = { ...original, id: "test-source-link", to: junction };
  design.wires = [{ ...original, from: junction }, ...design.wires.filter((wire) => wire.id !== wireId)];
  expect(validateCircuit(design, catalog)).toEqual([]);

  const faulted = advanceCircuitClock(design, catalog, 0.1);
  const plc = faulted.components.find((component) => component.id === "plc")!;
  expect(plc.properties.runtimeQ0).toBe(false);
  expect(plc.properties.runtimeError).toMatch(new RegExp(`Required analog terminal ${terminalReference}\\..*has no driving signal`));
  expect(executeCircuitModels(faulted, catalog).find((run) => run.reference === "PLC1")?.output.value).toContain("AI0 INVALID");

  const restored = { ...faulted, wires: [...faulted.wires, sourceWire] };
  expect(validateCircuit(restored, catalog)).toEqual([]);
  const recovered = executeCircuitModels(advanceCircuitClock(restored, catalog, 0.1), catalog);
  expect(recovered.find((run) => run.reference === "PLC1")?.output.value).toContain("AI0 20736");
  expect(recovered.find((run) => run.reference === "K1")?.output.value).toBe("ON");
});

it.each(["in-0", "ai-0"])("inhibits retained PLC state on a fault at %s and resumes after valid input", terminal => {
  const design: CircuitDocument = { id: "fault", name: "Fault", description: "", revision: 1, components: [
    { id: "source", definitionId: "logic.math-divide", reference: "MTH1", x: 100, y: 100, rotation: 0, properties: { left: 1, right: 0 } },
    { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 300, y: 100, rotation: 0, properties: { program: "ADD D0 1 D0; GT D0 0; OUT Q0", runtimeD0: 7, runtimeQ0: true } },
    { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: true } },
  ], wires: [
    { id: "w1", from: { componentId: "source", terminalId: "out" }, to: { componentId: "plc", terminalId: terminal }, points: [] },
    { id: "w2", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
  ] };
  let runtime = design;
  for (let scan = 0; scan < 3; scan++) runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const plc = runtime.components[1].properties;
  expect(plc.runtimeD0).toBe(7);
  expect(plc.runtimeQ0).toBe(false);
  expect(plc.runtimeError).toContain("Division by zero");
  expect(executeCircuitModels(runtime, catalogById).find(r => r.reference === "K1")?.output.error).toContain("Division by zero");
  expect(design.components[1].properties.runtimeQ0).toBe(true);
  runtime.components[0] = { ...runtime.components[0], definitionId: terminal === "in-0" ? "logic.no-contact" : "signal.adc", properties: terminal === "in-0" ? { input: true } : { milliamp: 12 } };
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(runtime.components[1].properties.runtimeD0).toBe(8);
  expect(runtime.components[1].properties.runtimeError).toBe("");
  expect(executeCircuitModels(runtime, catalogById).find(r => r.reference === "K1")?.output.value).toBe("ON");
});
