import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { CircuitDocument } from "../src/types/electrical";

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
