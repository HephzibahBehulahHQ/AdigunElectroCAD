import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { validateCircuit } from "../src/electrical/topology";
import type { CircuitDocument } from "../src/types/electrical";

it("reads converted 4–20 mA levels in the PLC program and switches a wired output", () => {
  const design: CircuitDocument = {
    id: "analog-plc", name: "Level threshold control", description: "Two independent 4–20 mA inputs to raw PLC comparisons", revision: 1,
    components: [
      { id: "level", definitionId: "sensor.level-4-20", reference: "B1", x: 100, y: 100, rotation: 0, properties: { levelPercent: 0 } },
      { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 300, y: 100, rotation: 0, properties: { milliamp: 4 } },
      { id: "level2", definitionId: "sensor.level-4-20", reference: "B2", x: 100, y: 250, rotation: 0, properties: { levelPercent: 0 } },
      { id: "adc2", definitionId: "signal.adc", reference: "ADC2", x: 300, y: 250, rotation: 0, properties: { milliamp: 4 } },
      { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 500, y: 100, rotation: 0, properties: { program: "GT AI0 13824; OUT Q0; GT AI1 13824; OUT Q1" } },
      { id: "coil2", definitionId: "logic.output-coil", reference: "K2", x: 700, y: 250, rotation: 0, properties: { input: false } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 700, y: 100, rotation: 0, properties: { input: false } },
    ],
    wires: [
      { id: "w1", from: { componentId: "level", terminalId: "signal" }, to: { componentId: "adc", terminalId: "in" }, points: [] },
      { id: "w4", from: { componentId: "level2", terminalId: "signal" }, to: { componentId: "adc2", terminalId: "in" }, points: [] },
      { id: "w5", from: { componentId: "adc2", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-1" }, points: [] },
      { id: "w6", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "coil2", terminalId: "in" }, points: [] },
      { id: "w2", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [] },
      { id: "w3", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
    ],
  };
  expect(validateCircuit(design, catalogById)).toEqual([]);
  const before = JSON.stringify(design);
  let runtime = structuredClone(design);
  for (const [level, level2, raw, raw2, expected, expected2] of [[25, 75, 6912, 20736, "OFF", "ON"], [75, 25, 20736, 6912, "ON", "OFF"], [50, 50, 13824, 13824, "OFF", "OFF"]] as const) {
    runtime = setCircuitLevelInput(runtime, catalogById, "level", level);
    runtime = setCircuitLevelInput(runtime, catalogById, "level2", level2);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    const runs = executeCircuitModels(runtime, catalogById);
    expect(runs.find((run) => run.reference === "PLC1")!.output.value).toContain(`AI0 ${raw}`);
    expect(runs.find((run) => run.reference === "PLC1")!.output.value).toContain(`AI1 ${raw2}`);
    expect(runs.find((run) => run.reference === "K1")!.output.value).toBe(expected);
    expect(runs.find((run) => run.reference === "K2")!.output.value).toBe(expected2);
  }
  expect(JSON.stringify(design)).toBe(before);
  for (const value of [-1, 101, NaN, Infinity]) expect(() => setCircuitLevelInput(runtime, catalogById, "level", value)).toThrow();
  expect(() => setCircuitLevelInput(runtime, catalogById, "plc", 50)).toThrow();
});
