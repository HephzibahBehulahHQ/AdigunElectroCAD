import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock, setCircuitBooleanInput, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { validateCircuit } from "../src/electrical/topology";
import type { CircuitDocument } from "../src/types/electrical";

it("reports both required PLC channels when disconnected and clears each fault after reconnection", () => {
  const design = createAnalogLevelProject().document;
  const plc = design.components.find((component) => component.id === "plc")!;
  plc.properties.requireWiredAi1 = true;
  plc.properties.program = "GT AI0 0; OUT Q0; GT AI1 0; OUT Q1";
  const ai0 = design.wires.find((wire) => wire.to.componentId === "plc" && wire.to.terminalId === "ai-0")!;
  const ai1 = { ...ai0, id: "analog-channel-1", to: { ...ai0.to, terminalId: "ai-1" } };
  const remaining = design.wires.filter((wire) => wire !== ai0);
  const scan = (wires: CircuitDocument["wires"]) => {
    const runtime = advanceCircuitClock({ ...design, wires }, catalogById, 0.1);
    return executeCircuitModels(runtime, catalogById).find((run) => run.componentId === "plc")!.output;
  };

  const broken = scan(remaining);
  expect(broken.error).toContain("PLC1.AI0 raw has no wire");
  expect(broken.error).toContain("PLC1.AI1 raw has no wire");
  expect(broken.value).toContain("Q0 OFF · Q1 OFF");
  const partial = scan([...remaining, ai0]);
  expect(partial.error).toContain("PLC1.AI1 raw has no wire");
  expect(partial.error).not.toContain("PLC1.AI0");
  expect(scan([...remaining, ai0, ai1]).error).toBeUndefined();
});

it("inhibits the PLC on ADC overrange and underrange, then recovers at the modeled limits", () => {
  const runtime = createAnalogLevelProject().document;
  runtime.wires = runtime.wires.filter((wire) => wire.id !== "level-current");
  const adc = runtime.components.find((component) => component.id === "adc")!;
  adc.properties.requireWiredInput = false;
  let state = runtime;
  const sample = (milliamp: number) => {
    state = {
      ...state,
      components: state.components.map((component) => component.id === "adc"
        ? { ...component, properties: { ...component.properties, milliamp } }
        : component),
    };
    state = advanceCircuitClock(state, catalogById, 0.1);
    return executeCircuitModels(state, catalogById);
  };
  const upperLimit = sample(20);
  expect(upperLimit.find((run) => run.reference === "PLC1")?.output.value).toContain("AI0 27648");
  expect(upperLimit.find((run) => run.reference === "K1")?.output.value).toBe("ON");
  for (const current of [20.1, 3.9]) {
    const results = sample(current);
    expect(results.find((run) => run.reference === "ADC1")?.output).toMatchObject({ value: "INVALID", error: expect.stringContaining("4–20 mA") });
    expect(results.find((run) => run.reference === "PLC1")?.output.value).toContain("AI0 INVALID");
    expect(results.find((run) => run.reference === "PLC1")?.output.value).toContain("Q0 OFF");
  }
  expect(sample(4).find((run) => run.reference === "PLC1")?.output.value).toContain("AI0 0");
  expect(sample(20).find((run) => run.reference === "K1")?.output.value).toBe("ON");
});

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

it("fails an open 4–20 mA loop closed without presenting the last raw value as valid", () => {
  const design = createAnalogLevelProject().document;
  const before = JSON.stringify(design);
  let runtime = setCircuitLevelInput(design, catalogById, "level", 75);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "K1")!.output.value).toBe("ON");

  runtime = setCircuitBooleanInput(runtime, catalogById, "level", "simulateOpenLoop", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const runs = executeCircuitModels(runtime, catalogById);
  const transmitter = runs.find((run) => run.reference === "B1")!;
  const adc = runs.find((run) => run.reference === "ADC1")!;
  const plc = runs.find((run) => run.reference === "PLC1")!;
  const coil = runs.find((run) => run.reference === "K1")!;
  const trace = JSON.parse(String(runtime.components.find((component) => component.reference === "PLC1")!.properties.runtimeScanTrace));

  expect(transmitter.output.error).toMatch(/loop is open/i);
  expect(adc.output.error).toMatch(/loop is open/i);
  expect(plc.output.error).toMatch(/loop is open/i);
  expect(plc.output.value).toContain("AI0 INVALID");
  expect(plc.output.value).toContain("Q0 OFF");
  expect(coil.output.error).toMatch(/loop is open/i);
  expect(coil.evaluatedProperties.input).toBe(false);
  expect(trace.at(-1).status).toBe("inhibited");
  expect(JSON.stringify(design)).toBe(before);
});
