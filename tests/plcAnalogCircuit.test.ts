import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { validateCircuit } from "../src/electrical/topology";
import type { CircuitDocument } from "../src/types/electrical";

it("reads converted 4–20 mA levels in the PLC program and switches a wired output", () => {
  const design: CircuitDocument = {
    id: "analog-plc", name: "Level threshold control", description: "4–20 mA to raw PLC comparison", revision: 1,
    components: [
      { id: "level", definitionId: "sensor.level-4-20", reference: "B1", x: 100, y: 100, rotation: 0, properties: { levelPercent: 0 } },
      { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 300, y: 100, rotation: 0, properties: { milliamp: 4 } },
      { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 500, y: 100, rotation: 0, properties: { program: "GT AI0 13824; OUT Q0" } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 700, y: 100, rotation: 0, properties: { input: false } },
    ],
    wires: [
      { id: "w1", from: { componentId: "level", terminalId: "signal" }, to: { componentId: "adc", terminalId: "in" }, points: [] },
      { id: "w2", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [] },
      { id: "w3", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
    ],
  };
  expect(validateCircuit(design, catalogById)).toEqual([]);
  const before = JSON.stringify(design);
  let runtime = structuredClone(design);
  for (const [level, raw, expected] of [[0, 0, "OFF"], [50, 13824, "OFF"], [75, 20736, "ON"], [100, 27648, "ON"], [25, 6912, "OFF"]] as const) {
    runtime = setCircuitLevelInput(runtime, catalogById, "level", level);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    const runs = executeCircuitModels(runtime, catalogById);
    expect(runs.find((run) => run.reference === "PLC1")!.output.value).toContain(`AI0 ${raw}`);
    expect(runs.find((run) => run.reference === "K1")!.output.value).toBe(expected);
  }
  expect(JSON.stringify(design)).toBe(before);
  for (const value of [-1, 101, NaN, Infinity]) expect(() => setCircuitLevelInput(runtime, catalogById, "level", value)).toThrow();
  expect(() => setCircuitLevelInput(runtime, catalogById, "plc", 50)).toThrow();
});
