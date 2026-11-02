import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { scanPlcProgram } from "../src/simulation/plcProgram";
import type { CircuitDocument } from "../src/types/electrical";

it.each(["I0", "I1"])("reads both transition directions from the previous scan of %s", (address) => {
  for (const previous of [false, true]) for (const current of [false, true]) {
    const inputs = address === "I0" ? [current, false] : [false, current];
    const memory = address === "I0" ? [previous, false] : [false, previous];
    expect(scanPlcProgram(`LDP ${address}; OUT Q0`, inputs[0], inputs[1], false, 0, undefined, memory)).toEqual({ ok: true, output: current && !previous });
    expect(scanPlcProgram(`LDF ${address}; OUT Q0`, inputs[0], inputs[1], false, 0, undefined, memory)).toEqual({ ok: true, output: previous && !current });
  }
});

it.each(["LDP Q0", "LDF AI0", "LDP I2", "LDF", "LDP I0 extra"])("rejects invalid edge instruction %s", (instruction) => {
  expect(scanPlcProgram(`${instruction}; OUT Q0`, true, false, true)).toMatchObject({ ok: false, output: false });
});

it("uses one input snapshot for repeated edge reads within a scan", () => {
  expect(scanPlcProgram("LDP I0; SET Q0; LDP I0; RESET Q0", true, false, false)).toEqual({ ok: true, output: false });
  expect(scanPlcProgram("LDF I0; ANDN I1; OUT Q0", false, true, true, 0, undefined, [true, false])).toEqual({ ok: true, output: false });
});

it.each(["ANDP", "ANDF", "ORP", "ORF"])("combines %s with the current Boolean accumulator", (operation) => {
  for (const accumulator of [false, true]) for (const current of [false, true]) for (const previous of [false, true]) {
    const pulse = operation.endsWith("P") ? current && !previous : previous && !current;
    const expected = operation.startsWith("AND") ? accumulator && pulse : accumulator || pulse;
    expect(scanPlcProgram(`LD I0; ${operation} I1; OUT Q0`, accumulator, current, false, 0, undefined, [false, previous])).toEqual({ ok: true, output: expected });
  }
  expect(scanPlcProgram(`${operation} I0; OUT Q0`, true, false, true)).toMatchObject({ ok: false, output: false });
  expect(scanPlcProgram(`LD I0; ${operation} Q0; OUT Q0`, true, false, true)).toMatchObject({ ok: false, output: false });
});

it.each(["LDP", "LDF"])("runs %s from a wired input to a wired coil with pause and reset", (operation) => {
  const design: CircuitDocument = {
    id: "plc-edges", name: "Input transition pulse", description: "Wired scan-based input edge", revision: 1,
    components: [
      { id: "source", definitionId: "logic.no-contact", reference: "S1", x: 100, y: 100, rotation: 0, properties: { input: false } },
      { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 300, y: 100, rotation: 0, properties: { inputA: true, program: `${operation} I0; OUT Q0` } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: false } },
    ],
    wires: [
      { id: "w1", from: { componentId: "source", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
      { id: "w2", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
    ],
  };
  expect(validateCircuit(design, catalogById)).toEqual([]);
  const saved = structuredClone(design);
  let runtime = advanceCircuitClock(design, catalogById, 0.1);
  const output = () => executeCircuitModels(runtime, catalogById).find((run) => run.componentId === "coil")!.output.value;
  expect(output()).toBe("OFF"); // Wired false overrides the configured local true.
  for (const [input, expected] of [[true, operation === "LDP"], [true, false], [false, operation === "LDF"], [false, false], [true, operation === "LDP"]] as const) {
    runtime = setCircuitBooleanInput(runtime, catalogById, "source", "input", input);
    const paused = advanceCircuitClock(runtime, catalogById, 0);
    expect(paused.components.find((c) => c.id === "plc")!.properties).toEqual(runtime.components.find((c) => c.id === "plc")!.properties);
    runtime = advanceCircuitClock(paused, catalogById, 0.1);
    expect(output()).toBe(expected ? "ON" : "OFF");
  }
  const cleared = resetCircuitClock(runtime, catalogById);
  expect(cleared.components.find((c) => c.id === "plc")!.properties.runtimeInput0Previous).toBeUndefined();
  runtime = advanceCircuitClock(cleared, catalogById, 0.1);
  expect(output()).toBe(operation === "LDP" ? "ON" : "OFF");
  expect(design).toEqual(saved);
});

it("keeps edge history independent between PLC modules and input addresses", () => {
  const document: CircuitDocument = {
    id: "isolated-plcs", name: "Independent input history", description: "Two scanned PLC modules", revision: 1, wires: [],
    components: [false, true].map((inputB, index) => ({ id: `plc-${index}`, definitionId: "iec.plc-digital-io.01", reference: `PLC${index + 1}`, x: 100 + index * 200, y: 100, rotation: 0, properties: { inputA: !inputB, inputB, program: "LDP I1; OUT Q0" } })),
  };
  let runtime = advanceCircuitClock(document, catalogById, 0.1);
  expect(runtime.components.map((c) => c.properties.runtimeQ0)).toEqual([false, true]);
  runtime = setCircuitBooleanInput(runtime, catalogById, "plc-0", "inputB", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  expect(runtime.components.map((c) => c.properties.runtimeQ0)).toEqual([true, false]);
});
