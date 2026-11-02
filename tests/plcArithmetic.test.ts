import { expect, it } from "vitest";
import { scanPlcProgram } from "../src/simulation/plcProgram";
import { catalogById } from "../src/catalog/dolCatalog";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { advanceCircuitClock, resetCircuitClock, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";

it.each([["ADD", 8], ["SUB", 4], ["MUL", 12], ["DIV", 3]])("executes %s with numeric operands and a register destination", (operation, expected) => {
  const result = scanPlcProgram(`MOV 6 D0; ${operation} D0 2 D1; GT D1 3; OUT Q0`, false, false, false);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(result.registers?.[0]).toBe(6);
  expect(result.registers?.[1]).toBe(expected);
  expect(result.output).toBe(Number(expected) > 3);
});

it("retains registers between scans without mutating the previous bank", () => {
  const previous = [9, 0, 0, 0, 0, 0, 0, 0];
  const result = scanPlcProgram("ADD D0 1 D0; EQ D0 10; OUT Q0", false, false, false, 0, previous);
  expect(result).toMatchObject({ ok: true, output: true, registers: [10, 0, 0, 0, 0, 0, 0, 0] });
  expect(previous[0]).toBe(9);
});

it.each(["DIV 1 0 D0", "MOV NaN D0", "MOV 1 D8", "MOV I0 D0", "MUL 9007199254740991 2 D0", "ADD 1 2 AI0", "MOV 0x10 D0"])("rejects invalid numeric instruction %s without returning partial state", (instruction) => {
  const previous = [12, 0, 0, 0, 0, 0, 0, 0];
  expect(scanPlcProgram(`MOV 99 D0; ${instruction}; LD I0; OUT Q0`, true, false, true, 0, previous)).toMatchObject({ ok: false, output: false });
  expect(previous[0]).toBe(12);
});

it("supports signed decimal math and register comparisons", () => {
  expect(scanPlcProgram("MOV -2.5 D0; MUL D0 -2 D1; LT D0 D1; OUT Q0", false, false, false)).toMatchObject({ ok: true, output: true, registers: [-2.5, 5, 0, 0, 0, 0, 0, 0] });
});

it("scales a wired transmitter through ADC and PLC math into a real output coil", () => {
  const design = createAnalogLevelProject().document;
  design.components.find((component) => component.id === "plc")!.properties.program = "DIV AI0 276.48 D0; GT D0 50; OUT Q0";
  const original = JSON.stringify(design);
  let runtime = resetCircuitClock(design, catalogById);
  for (const [percent, expected] of [[0, "OFF"], [50, "OFF"], [75, "ON"], [100, "ON"], [25, "OFF"]] as const) {
    runtime = advanceCircuitClock(setCircuitLevelInput(runtime, catalogById, "level", percent), catalogById, 0.1);
    expect(runtime.components.find((component) => component.id === "plc")!.properties.runtimeD0).toBeCloseTo(percent);
    const runs = executeCircuitModels(runtime, catalogById);
    expect(runs.find((run) => run.reference === "K1")!.output.value).toBe(expected);
    expect(runs.find((run) => run.reference === "PLC1")!.output.value).toContain(`D0 ${percent}`);
  }
  const paused = advanceCircuitClock(runtime, catalogById, 0);
  expect(paused.components.find((component) => component.id === "plc")!.properties.runtimeD0).toBe(25);
  expect(resetCircuitClock(runtime, catalogById).components.find((component) => component.id === "plc")!.properties.runtimeD0).toBeUndefined();
  expect(JSON.stringify(design)).toBe(original);
});

it("fails Q0 off on arithmetic faults and preserves the last committed register bank", () => {
  const design = createAnalogLevelProject().document;
  const plc = design.components.find((component) => component.id === "plc")!;
  plc.properties = { program: "MOV 99 D0; DIV 1 0 D1; LD I0; OUT Q0", runtimeD0: 12, runtimeQ0: true };
  const runtime = advanceCircuitClock(design, catalogById, 0.1);
  const properties = runtime.components.find((component) => component.id === "plc")!.properties;
  expect(properties.runtimeQ0).toBe(false);
  expect(properties.runtimeD0).toBe(12);
  expect(properties.runtimeError).toContain("division by zero");
});
