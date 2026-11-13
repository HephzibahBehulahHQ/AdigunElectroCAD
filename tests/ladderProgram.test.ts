import { expect, it } from "vitest";
import { compileLadder, duplicateLadderRung, moveLadderRung, parseLadder, type LadderRung } from "../src/simulation/ladderProgram";
import { previewLadder } from "../src/simulation/ladderProgram";
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

it("moves rungs without mutating the draft and compiles their new priority order", () => {
  const rungs: LadderRung[] = [
    { stages: [[{ address: "I0", inverted: false }]], coil: "SET" },
    { stages: [[{ address: "I1", inverted: false }]], coil: "RESET" },
    { stages: [[{ address: "Q0", inverted: false }]], coil: "OUT" },
  ];
  const moved = moveLadderRung(rungs, 2, 1);
  expect(moved).not.toBeNull();
  expect(compileLadder(moved!)).toBe("LD I0; SET Q0; LD Q0; OUT Q0; LD I1; RESET Q0");
  expect(compileLadder(rungs)).toBe("LD I0; SET Q0; LD I1; RESET Q0; LD Q0; OUT Q0");
  expect(moved).not.toBe(rungs);
  expect(moveLadderRung(rungs, -1, 0)).toBeNull();
  expect(moveLadderRung(rungs, 0, 3)).toBeNull();
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program: compileLadder(rungs), onApply: () => undefined }));
  expect(markup).toContain('aria-label="Move rung 2 up"');
  expect(markup).toContain('aria-label="Move rung 1 down"');
});

it("duplicates a rung beside its source with independent contacts and coil settings", () => {
  const source: LadderRung = { stages: [[{ comparison: "GT", left: "D0", right: "50" }]], coil: { type: "MEMORY", address: "M2", operation: "SET" } };
  const rungs: LadderRung[] = [source, { stages: [[{ address: "M2", inverted: false }]], coil: "OUT" }];
  const duplicated = duplicateLadderRung(rungs, 0);
  expect(duplicated).toEqual([source, source, rungs[1]]);
  expect(duplicated![1]).not.toBe(source);
  expect(duplicated![1].stages[0][0]).not.toBe(source.stages[0][0]);
  expect(duplicated![1].coil).not.toBe(source.coil);
  const copiedContact = duplicated![1].stages[0][0];
  if (!("comparison" in copiedContact)) throw new Error("Expected a numeric comparison contact");
  copiedContact.right = "75";
  expect((source.stages[0][0] as Extract<typeof copiedContact, { comparison: string }>).right).toBe("50");
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program: compileLadder(rungs), onApply: () => undefined }));
  expect(markup).toContain('aria-label="Duplicate rung 1"');
  expect(duplicateLadderRung(rungs, -1)).toBeNull();
  expect(duplicateLadderRung(Array.from({ length: 16 }, () => source), 0)).toBeNull();
});


it("round-trips independent Q1 ladder coils and previews Q1 feedback", () => {
  const rungs: LadderRung[] = [
    { stages: [[{ address: "I1", inverted: false }]], coil: { type: "OUTPUT", address: "Q1", operation: "OUT" } },
    { stages: [[{ address: "Q1", inverted: false }]], coil: "OUT" },
  ];
  const program = compileLadder(rungs);
  expect(program).toBe("LD I1; OUT Q1; LD Q1; OUT Q0");
  expect(parseLadder(program)).toEqual(rungs);
  const inputs = { input0: false, input1: true, q0: false, q1: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: [] };
  expect(previewLadder(rungs, inputs)).toMatchObject({ output: true, output1: true });
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program, onApply: () => undefined }));
  expect(markup).toContain("Output Q1");
  const scan = scanPlcProgram(program, false, true, false, 0, undefined, [], undefined, 0.1, undefined, false);
  expect(scan).toMatchObject({ ok: true, output: true, output1: true });
});

it("round-trips TON timer coils and preview timer contacts", () => {
  const rungs: LadderRung[] = [
    { stages: [[{ address: "I0", inverted: false }]], coil: { type: "TON", timer: "T0", presetSeconds: 0.2 } },
    { stages: [[{ address: "T0", inverted: false }]], coil: "OUT" },
  ];
  const program = compileLadder(rungs);
  expect(program).toBe("LD I0; TON T0 0.2; LD T0; OUT Q0");
  expect(parseLadder(program)).toEqual(rungs);
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program, onApply: () => undefined }));
  expect(markup).toContain("On-delay timer");
  const first = previewLadder(rungs, { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: [], deltaSeconds: 0.1 });
  expect(first.output).toBe(false);
  const second = previewLadder(rungs, { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: [], timers: { T0: { elapsedSeconds: 0.1, done: false } }, deltaSeconds: 0.1 });
  expect(second.output).toBe(true);
  expect(() => compileLadder([{ stages: [[{ address: "I0", inverted: false }]], coil: { type: "TON", timer: "T0", presetSeconds: -1 } }, { stages: [[{ address: "I0", inverted: false }]], coil: "OUT" }])).toThrow();
});

it("round-trips internal relay contacts and coils and previews retained logic", () => {
  const rungs: LadderRung[] = [
    { stages: [[{ address: "I0", inverted: false }]], coil: { type: "MEMORY", address: "M0", operation: "SET" } },
    { stages: [[{ address: "I1", inverted: false }]], coil: { type: "MEMORY", address: "M0", operation: "RESET" } },
    { stages: [[{ address: "M0", inverted: false }]], coil: "OUT" },
  ];
  const program = compileLadder(rungs);
  expect(program).toBe("LD I0; SET M0; LD I1; RESET M0; LD M0; OUT Q0");
  expect(parseLadder(program)).toEqual(rungs);
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program, onApply: () => undefined }));
  expect(markup).toContain("Internal memory coil");
  expect(markup).toContain("M0");
  const first = previewLadder(rungs, { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: [], memory: Array(8).fill(false) });
  expect(first).toMatchObject({ output: true, memory: [true, false, false, false, false, false, false, false] });
  const reset = previewLadder(rungs, { input0: false, input1: true, q0: true, previousInput0: true, previousInput1: false, analogInput0: 0, registers: [], memory: first.memory });
  expect(reset).toMatchObject({ output: false, memory: Array(8).fill(false) });
  const scan = scanPlcProgram(program, true, false, false, 0, undefined, [], undefined, 0.1, Array(8).fill(false));
  expect(scan).toMatchObject({ ok: true, output: first.output, memory: first.memory });
  expect(() => compileLadder([{ stages: [[{ address: "I0", inverted: false }]], coil: { type: "MEMORY", address: "M0", operation: "SET" } }])).toThrow(/assign Q0 or Q1/);
});

it("previews conducting contacts against the next scan and retained Q0", () => {
  const inputs = { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: Array(8).fill(0) };
  const preview = previewLadder(holding, inputs);
  expect(preview).toMatchObject({ rungEnergized: [true], contactEnergized: [[[true, false], [true]]], output: true });
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program: compileLadder(holding), onApply: () => undefined, previewInputs: inputs }));
  expect(markup).toContain("class=\"ladder-powered\"");
  expect(markup).toContain("Next-scan logic preview");
  const held = previewLadder(holding, { ...inputs, input0: false, q0: true });
  expect(held).toMatchObject({ rungEnergized: [true], contactEnergized: [[[false, true], [true]]], output: true });
  const stopped = previewLadder(holding, { ...inputs, input0: false, input1: true, q0: true });
  expect(stopped).toMatchObject({ rungEnergized: [false], contactEnergized: [[[false, true], [false]]], output: false });
});

it("previews rising-edge contacts only when the sampled input transitions", () => {
  const rung: LadderRung[] = [{ stages: [[{ address: "I0", inverted: false, edge: "positive" }]], coil: "OUT" }];
  expect(previewLadder(rung, { input0: true, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 0, registers: [] }).rungEnergized).toEqual([true]);
  expect(previewLadder(rung, { input0: true, input1: false, q0: false, previousInput0: true, previousInput1: false, analogInput0: 0, registers: [] }).rungEnergized).toEqual([false]);
});

it("round-trips numeric comparison contacts in series and parallel and matches PLC scan output", () => {
  const rungs: LadderRung[] = [
    { stages: [
      [{ address: "I0", inverted: false }, { comparison: "GT", left: "D0", right: "50" }],
      [{ comparison: "LT", left: "AI0", right: "20000" }],
    ], coil: "OUT" },
    { stages: [[{ comparison: "EQ", left: "D0", right: "50" }]], coil: "SET" },
  ];
  const program = compileLadder(rungs);
  expect(program).toContain("PUSH; GT D0 50; ORPOP");
  expect(program).toContain("PUSH; LT AI0 20000; ANDPOP");
  expect(parseLadder(program)).toEqual(rungs);
  const markup = renderToStaticMarkup(createElement(LadderEditor, { program, onApply: () => undefined }));
  expect(markup).toContain("Numeric comparison");
  expect(markup).toContain("GT D0 50");
  for (const input0 of [false, true]) for (const q0 of [false, true]) for (const register of [0, 50, 51]) for (const analog of [0, 19999, 20000]) {
    const preview = previewLadder(rungs, { input0, input1: false, q0, previousInput0: false, previousInput1: false, analogInput0: analog, registers: [register] });
    const scan = scanPlcProgram(program, input0, false, q0, analog, [register]);
    expect(scan).toMatchObject({ ok: true, output: preview.output });
  }
  expect(() => compileLadder([{ stages: [[{ comparison: "GT", left: "AI0", right: "27649" }]], coil: "OUT" }])).toThrow();
  expect(parseLadder("GT AI0 27649; OUT Q0")).toBeNull();
  const selfCompare: LadderRung[] = [{ stages: [[{ comparison: "EQ", left: "AI0", right: "AI0" }]], coil: "OUT" }];
  const selfCompareProgram = compileLadder(selfCompare);
  expect(parseLadder(selfCompareProgram)).toEqual(selfCompare);
  expect(previewLadder(selfCompare, { input0: false, input1: false, q0: false, previousInput0: false, previousInput1: false, analogInput0: 13824, registers: [] }).output).toBe(true);
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

it.each(["", "LD I0; AND I1; OR Q0; OUT Q0", "LD I0; XOR I1; OUT Q0", "PUSH; LD I0; ANDPOP; OUT Q0", "LD I0; PUSH; LD I1; OUT Q0"])("does not reinterpret unsupported or ambiguous text %s", (program) => {
  expect(parseLadder(program)).toBeNull();
});

it.each(["LD I0; PUSH; OUT Q0", "LD I0; ANDPOP; OUT Q0", "PUSH; LD I0; OUT Q0", "LD I0; PUSH extra; OUT Q0"])("fails closed for invalid branch program %s", (program) => {
  expect(scanPlcProgram(program, true, true, true)).toMatchObject({ ok: false, output: false });
});


it("uses the full 32-instruction budget for larger branch layouts and up to sixteen rungs", () => {
  const contacts = Array.from({ length: 5 }, (_, index) => ({ address: index % 2 ? "I1" as const : "I0" as const, inverted: false }));
  const stages = Array.from({ length: 6 }, () => contacts.map((contact) => ({ ...contact })));
  const branchRung: LadderRung[] = [{ stages, coil: "OUT" }];
  const branchProgram = compileLadder(branchRung);
  expect(parseLadder(branchProgram)).toEqual(branchRung);
  expect(branchProgram.split(";").length).toBeLessThanOrEqual(32);

  const simpleRung: LadderRung = { stages: [[{ address: "I0", inverted: false }]], coil: "OUT" };
  const sixteenRungs = Array.from({ length: 16 }, () => simpleRung);
  const program = compileLadder(sixteenRungs);
  expect(program.split(";")).toHaveLength(32);
  expect(parseLadder(program)).toEqual(sixteenRungs);
  expect(() => compileLadder([...sixteenRungs, simpleRung])).toThrow("one to sixteen");
  expect(duplicateLadderRung(sixteenRungs, 0)).toBeNull();
});

it("enforces the PLC executable instruction limit", () => {
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


