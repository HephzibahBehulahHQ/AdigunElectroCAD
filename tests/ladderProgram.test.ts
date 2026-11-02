import { expect, it } from "vitest";
import { compileLadder, parseLadder, type LadderRung } from "../src/simulation/ladderProgram";
import { scanPlcProgram } from "../src/simulation/plcProgram";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { catalogById } from "../src/catalog/dolCatalog";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";

const holding: LadderRung[] = [{ stages: [[{ address: "I0", inverted: false }, { address: "Q0", inverted: false }], [{ address: "I1", inverted: true }]], coil: "OUT" }];

it("round-trips the start/stop ladder and compiles its actual holding program", () => {
  const program = compileLadder(holding);
  expect(program).toBe("LD I0; OR Q0; ANDN I1; OUT Q0");
  expect(parseLadder(program.toLowerCase().replaceAll("; ", "\n"))).toEqual(holding);
});

it("executes parallel groups in series without changing Boolean precedence", () => {
  const rungs: LadderRung[] = [{ stages: [holding[0].stages[0], [{ address: "I1", inverted: true }, { address: "I0", inverted: false }]], coil: "OUT" }];
  const program = compileLadder(rungs);
  expect(program).toContain("PUSH; LDN I1; OR I0; ANDPOP");
  expect(parseLadder(program)).toEqual(rungs);
  for (const a of [false, true]) for (const b of [false, true]) for (const previous of [false, true]) {
    expect(scanPlcProgram(program, a, b, previous)).toEqual({ ok: true, output: (a || previous) && (!b || a) });
  }
});

it("keeps later reset priority across multiple ladder rungs", () => {
  const rungs: LadderRung[] = [{ stages: [[{ address: "I0", inverted: false }]], coil: "SET" }, { stages: [[{ address: "I1", inverted: false }]], coil: "RESET" }];
  const program = compileLadder(rungs);
  expect(parseLadder(program)).toEqual(rungs);
  expect(scanPlcProgram(program, true, true, true)).toEqual({ ok: true, output: false });
  expect(scanPlcProgram(program, true, false, false)).toEqual({ ok: true, output: true });
});

it.each(["", "LD I0; AND I1; OR Q0; OUT Q0", "GT AI0 100; OUT Q0", "LD I0; XOR I1; OUT Q0", "LD I0; OUT Q1", "PUSH; LD I0; ANDPOP; OUT Q0", "LD I0; PUSH; LD I1; OUT Q0"])("does not reinterpret unsupported or ambiguous text %s", (program) => {
  expect(parseLadder(program)).toBeNull();
});

it.each(["LD I0; PUSH; OUT Q0", "LD I0; ANDPOP; OUT Q0", "PUSH; LD I0; OUT Q0", "LD I0; PUSH extra; OUT Q0"])("fails closed for invalid branch program %s", (program) => {
  expect(scanPlcProgram(program, true, true, true)).toMatchObject({ ok: false, output: false });
});

it("enforces editor shape and executable instruction limits", () => {
  expect(() => compileLadder([])).toThrow();
  expect(() => compileLadder([{ stages: [[]], coil: "OUT" }])).toThrow();
  const stage = Array.from({ length: 4 }, () => ({ address: "I0" as const, inverted: false }));
  const large: LadderRung[] = Array.from({ length: 4 }, () => ({ stages: [stage, stage, stage, stage], coil: "OUT" }));
  expect(() => compileLadder(large)).toThrow("32 instructions");
});

it("drives a wired coil through start, release, stop and release using compiled ladder", () => {
  const design = createAnalogLevelProject().document;
  design.components.find((component) => component.id === "plc")!.properties.program = compileLadder(holding);
  const original = JSON.stringify(design);
  let runtime = resetCircuitClock(design, catalogById);
  for (const [start, stop, expected] of [[true, false, "ON"], [false, false, "ON"], [false, true, "OFF"], [false, false, "OFF"]] as const) {
    runtime = setCircuitBooleanInput(runtime, catalogById, "plc", "inputA", start);
    runtime = setCircuitBooleanInput(runtime, catalogById, "plc", "inputB", stop);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "K1")!.output.value).toBe(expected);
  }
  expect(JSON.stringify(design)).toBe(original);
});
