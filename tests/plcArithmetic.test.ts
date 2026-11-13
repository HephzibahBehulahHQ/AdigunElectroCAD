import { expect, it } from "vitest";
import { scanPlcProgram } from "../src/simulation/plcProgram";
import { catalogById } from "../src/catalog/dolCatalog";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { advanceCircuitClock, resetCircuitClock, setCircuitLevelInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import type { PlcTimerStates } from "../src/simulation/plcProgram";

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

it.each(["DIV 1 0 D0", "MOV NaN D0", "MOV 1 D8", "MOV I0 D0", "MUL 9007199254740991 2 D0", "ADD 1 2 AI0", "ADD 1 2 AI1", "MOV 0x10 D0"])("rejects invalid numeric instruction %s without returning partial state", (instruction) => {
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

it("accumulates TON time across scans, exposes done contacts, and resets on a false enable", () => {
  const program = "LD I0; TON T0 0.2; LD T0; OUT Q0";
  let timers: PlcTimerStates | undefined;
  const first = scanPlcProgram(program, true, false, false, 0, undefined, [], timers, 0.1);
  expect(first).toMatchObject({ ok: true, output: false, timers: { T0: { elapsedSeconds: 0.1, done: false } } });
  if (!first.ok) throw new Error(first.error);
  timers = first.timers;
  const second = scanPlcProgram(program, true, false, first.output, 0, undefined, [], timers, 0.1);
  expect(second).toMatchObject({ ok: true, output: true, timers: { T0: { elapsedSeconds: 0.2, done: true } } });
  if (!second.ok) throw new Error(second.error);
  const reset = scanPlcProgram(program, false, false, second.output, 0, undefined, [], second.timers, 0.1);
  expect(reset).toMatchObject({ ok: true, output: false, timers: { T0: { elapsedSeconds: 0, done: false } } });
});

it.each(["TON T4 1", "TON T0 -1", "TON T0 1; TON T0 1", "LD I0; TON T0 1; DIV 1 0 D0; OUT Q0"]) ("rejects invalid or faulting timer scan %s without committing timer state", (tail) => {
  const program = tail.includes("DIV") ? tail : `LD I0; ${tail}; LD I0; OUT Q0`;
  expect(scanPlcProgram(program, true, false, false, 0, undefined, [], { T0: { elapsedSeconds: 0.1, done: false } }, 0.1)).toMatchObject({ ok: false, output: false });
});

it("persists TON state in runtime properties and clears it on Stop", () => {
  const design = createAnalogLevelProject().document;
  const plc = design.components.find((component) => component.id === "plc")!;
  plc.properties = { ...plc.properties, inputA: true, program: "LD I0; TON T0 0.2; LD T0; OUT Q0" };
  const first = advanceCircuitClock(design, catalogById, 0.1);
  const second = advanceCircuitClock(first, catalogById, 0.1);
  expect(second.components.find((component) => component.id === "plc")!.properties).toMatchObject({ runtimeT0Elapsed: 0.2, runtimeT0Done: true, runtimeQ0: true });
  expect(resetCircuitClock(second, catalogById).components.find((component) => component.id === "plc")!.properties.runtimeT0Done).toBeUndefined();
});

it("retains internal memory relays across scans and applies OUT, SET and RESET", () => {
  const setProgram = "LD I0; SET M0; LD M0; OUT Q0";
  const set = scanPlcProgram(setProgram, true, false, false, 0, undefined, [], undefined, 0.1, Array(8).fill(false));
  expect(set).toMatchObject({ ok: true, output: true, memory: [true, false, false, false, false, false, false, false] });
  if (!set.ok) throw new Error(set.error);
  const held = scanPlcProgram(setProgram, false, false, set.output, 0, undefined, [], undefined, 0.1, set.memory);
  expect(held).toMatchObject({ ok: true, output: true, memory: set.memory });
  if (!held.ok) throw new Error(held.error);
  const reset = scanPlcProgram("LD I1; RESET M0; LD M0; OUT Q0", false, true, held.output, 0, undefined, [], undefined, 0.1, held.memory);
  expect(reset).toMatchObject({ ok: true, output: false, memory: Array(8).fill(false) });
  expect(scanPlcProgram("LD I0; OUT M1; LD M1; OUT Q0", true, false, false, 0, undefined, [], undefined, 0.1, Array(8).fill(false))).toMatchObject({ ok: true, output: true, memory: [false, true, false, false, false, false, false, false] });
});

it("does not commit memory relay changes from a faulting PLC scan", () => {
  const previous = [false, true, false, false, false, false, false, false];
  const result = scanPlcProgram("LD I0; SET M0; DIV 1 0 D0; LD M0; OUT Q0", true, false, false, 0, undefined, [], undefined, 0.1, previous);
  expect(result).toMatchObject({ ok: false, output: false });
  expect(previous).toEqual([false, true, false, false, false, false, false, false]);
});

it("persists PLC memory relays in runtime properties and clears them on Stop", () => {
  const design = createAnalogLevelProject().document;
  const plc = design.components.find((component) => component.id === "plc")!;
  plc.properties = { ...plc.properties, inputA: true, program: "LD I0; SET M0; LD M0; OUT Q0" };
  const first = advanceCircuitClock(design, catalogById, 0.1);
  const paused = advanceCircuitClock(first, catalogById, 0);
  expect(paused.components.find((component) => component.id === "plc")!.properties.runtimeM0).toBe(true);
  const second = advanceCircuitClock(first, catalogById, 0.1);
  expect(second.components.find((component) => component.id === "plc")!.properties).toMatchObject({ runtimeM0: true, runtimeQ0: true });
  const faulted = second.components.find((component) => component.id === "plc")!;
  faulted.properties.program = "LD I0; RESET M0; DIV 1 0 D0; LD M0; OUT Q0";
  const afterFault = advanceCircuitClock(second, catalogById, 0.1);
  expect(afterFault.components.find((component) => component.id === "plc")!.properties).toMatchObject({ runtimeM0: true, runtimeQ0: false });
  expect(resetCircuitClock(afterFault, catalogById).components.find((component) => component.id === "plc")!.properties.runtimeM0).toBeUndefined();
});


it.each([["GE", 50, 50, true], ["GE", 49, 50, false], ["LE", 50, 50, true], ["LE", 51, 50, false]] as const)("compares register values with inclusive %s boundaries", (operation, left, right, expected) => {
  expect(scanPlcProgram(`${operation} D0 ${right}; OUT Q0`, false, false, false, 0, [left])).toMatchObject({ ok: true, output: expected });
});

it("uses AI1 as an independent raw source for register scaling and comparison", () => {
  const result = scanPlcProgram("DIV AI1 276.48 D0; GT D0 50; OUT Q0", false, false, false, 0, undefined, [], undefined, 0.1, undefined, false, 20736);
  expect(result).toMatchObject({ ok: true, output: true, registers: [75, 0, 0, 0, 0, 0, 0, 0] });
});
