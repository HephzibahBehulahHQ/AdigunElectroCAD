import { expect, it } from "vitest";
import { compileLadder, parseLadder, previewLadder, type LadderRung } from "../src/simulation/ladderProgram";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LadderEditor } from "../src/components/LadderEditor";
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

it.each(["positive", "negative"] as const)("compiles and imports %s edge contacts in series and parallel branches", (edge) => {
  const pulse = { address: "I1" as const, inverted: false, edge };
  const initial = { address: "I0" as const, inverted: false };
  const suffix = edge === "positive" ? "P" : "F";
  const rungs: LadderRung[] = [
    { stages: [[pulse]], coil: "SET" },
    { stages: [[initial], [pulse]], coil: "OUT" },
    { stages: [[initial, pulse]], coil: "OUT" },
    { stages: [[initial], [initial, pulse]], coil: "RESET" },
  ];
  const program = compileLadder(rungs);
  expect(program).toContain(`LD${suffix} I1`);
  expect(program).toContain(`AND${suffix} I1`);
  expect(program).toContain(`OR${suffix} I1`);
  expect(parseLadder(program)).toEqual(rungs);
  for (const a of [false, true]) for (const b of [false, true]) for (const previousB of [false, true]) {
    const transition = edge === "positive" ? b && !previousB : previousB && !b;
    for (const [stages, expected] of [
      [[[initial], [pulse]], a && transition],
      [[[initial, pulse]], a || transition],
      [[[initial], [{ ...initial, inverted: true }, pulse]], a && (!a || transition)],
    ] as const) {
      const expression: LadderRung[] = [{ stages: stages.map((stage) => [...stage]), coil: "OUT" }];
      expect(scanPlcProgram(compileLadder(expression), a, b, false, 0, undefined, [false, previousB])).toEqual({ ok: true, output: expected });
    }
  }
});

it("rejects transition contacts on output addresses or inverted/unknown transition kinds", () => {
  for (const contact of [
    { address: "Q0", inverted: false, edge: "positive" },
    { address: "I0", inverted: true, edge: "negative" },
    { address: "I0", inverted: false, edge: "both" },
  ]) expect(() => compileLadder([{ stages: [[contact]], coil: "OUT" }] as LadderRung[])).toThrow();
  expect(parseLadder("LDP Q0; OUT Q0")).toBeNull();
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


it("previews conducting contacts against the next scan and retained Q0", () => {
  const inputs = { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false };
  const preview = previewLadder(holding, inputs);
  expect(preview).toMatchObject({ rungEnergized: [true], contactEnergized: [[[true, false], [true]]], output: true });
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program: compileLadder(holding), onApply: () => undefined, previewInputs: inputs }));
  expect(markup).toContain(`class="ladder-powered"`);
  expect(markup).toContain("Next-scan logic preview");
  const held = previewLadder(holding, { ...inputs, input0: false, q0: true });
  expect(held).toMatchObject({ rungEnergized: [true], contactEnergized: [[[false, true], [true]]], output: true });
  const stopped = previewLadder(holding, { ...inputs, input0: false, input1: true, q0: true });
  expect(stopped).toMatchObject({ rungEnergized: [false], contactEnergized: [[[false, true], [false]]], output: false });
});

it("previews rising-edge contacts only when the sampled input transitions", () => {
  const rung: LadderRung[] = [{ stages: [[{ address: "I0", inverted: false, edge: "positive" }]], coil: "OUT" }];
  expect(previewLadder(rung, { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false }).rungEnergized).toEqual([true]);
  expect(previewLadder(rung, { input0: true, input1: false, q0: false, previousInput0: true, previousInput1: false }).rungEnergized).toEqual([false]);
});
