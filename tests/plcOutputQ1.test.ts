import { expect, it } from "vitest";
import { scanPlcProgram } from "../src/simulation/plcProgram";

it("executes Q1 independently while preserving the legacy Q0 result", () => {
  const result = scanPlcProgram("LD I0; OUT Q1", true, false, false);
  expect(result).toMatchObject({ ok: true, output: false, output1: true });
});

it("supports Q1 as retained feedback and SET/RESET state", () => {
  const feedback = scanPlcProgram("LD Q1; OUT Q0", false, false, false, 0, undefined, [], undefined, 0.1, undefined, true);
  expect(feedback).toMatchObject({ ok: true, output: true });

  const latched = scanPlcProgram("LD I0; SET Q1; LD I1; RESET Q1", true, false, false);
  expect(latched).toMatchObject({ ok: true, output1: true });
});

it("keeps Q1 optional when older Q0-only programs run", () => {
  const result = scanPlcProgram("LD I0; OUT Q0", true, false, false);
  expect(result).toEqual({ ok: true, output: true });
});
