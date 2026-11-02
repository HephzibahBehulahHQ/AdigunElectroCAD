import { expect, it } from "vitest";
import { scanPlcProgram } from "../src/simulation/plcProgram";

it("runs a start/stop holding program with stop priority", () => {
  const program = "LD I0; OR Q0; ANDN I1; OUT Q0";
  let output = false;
  for (const [start, stop, expected] of [[true, false, true], [false, false, true], [true, true, false], [false, false, false]]) {
    const result = scanPlcProgram(program, start, stop, output);
    expect(result).toEqual({ ok: true, output: expected });
    output = result.output;
  }
});

it("shares Q0 between set and reset rungs, with later reset priority", () => {
  const program = "LD I0; SET Q0; LD I1; RESET Q0";
  expect(scanPlcProgram(program, true, false, false)).toEqual({ ok: true, output: true });
  expect(scanPlcProgram(program, false, false, true)).toEqual({ ok: true, output: true });
  expect(scanPlcProgram(program, true, true, true)).toEqual({ ok: true, output: false });
});

it.each(["", "AND I0; OUT Q0", "LD I0", "LD I3; OUT Q0", "LD I0; OUT Q1", "LD I0; RUN Q0", "LD I0; OUT Q0 extra", Array(33).fill("LD I0").join(";")])("fails closed for invalid program %s", (program) => {
  expect(scanPlcProgram(program, true, false, true)).toMatchObject({ ok: false, output: false });
});

it.each([
  ["LDN I0; OUT Q0", false, false, true],
  ["LD I0; AND I1; OUT Q0", true, false, false],
  ["LD I0; ORN I1; OUT Q0", false, false, true],
  ["LD I0; XOR I1; OUT Q0", true, true, false],
])("executes %s", (program, a, b, expected) => {
  expect(scanPlcProgram(program as string, a as boolean, b as boolean, false)).toEqual({ ok: true, output: expected });
});
