import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { templateLibrary } from "../src/projects/templateLibrary";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";

describe("circuit simulation clock", () => {
  it("scans wired PLC inputs, retains Q0, and fails closed on a program error", () => {
    const design = structuredClone(templateLibrary[2].document);
    const plc = design.components[1];
    plc.properties = { program: "LD I0; OR Q0; ANDN I1; OUT Q0", inputB: false, output: false };
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 0.1);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toContain("EXTENDED");
    runtime = setCircuitBooleanInput(runtime, catalogById, runtime.components[0].id, "detected", false);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(actuator()).toContain("EXTENDED");
    runtime = setCircuitBooleanInput(runtime, catalogById, runtime.components[1].id, "inputB", true);
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(actuator()).toBe("RETRACTED");
    runtime.components[1].properties.program = "LD I0; INVALID Q0";
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(actuator()).toBe("RETRACTED");
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "PLC1")!.output.value).toContain("ERROR: Unsupported operation");
    expect(resetCircuitClock(runtime, catalogById).components[1].properties.runtimeQ0).toBeUndefined();
    expect(plc.properties.runtimeQ0).toBeUndefined();
    expect(design.components[0].properties.detected).toBe(true);
    for (const property of ["program", "runtimeQ0", "missing"]) expect(() => setCircuitBooleanInput(runtime, catalogById, plc.id, property, true)).toThrow();
  });
  it.each(["positive", "negative"])("emits a single wired %s edge pulse per transition", (kind) => {
    let runtime = structuredClone(templateLibrary[3].document);
    runtime.components = [
      { id: "input", definitionId: "logic.no-contact", reference: "S1", x: 100, y: 100, rotation: 0, properties: { input: kind === "negative" } },
      { id: "edge", definitionId: `logic.edge-${kind}`, reference: "E1", x: 300, y: 100, rotation: 0, properties: { previous: kind === "negative", input: false } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: false } },
    ];
    runtime.wires = [
      { id: "w1", from: { componentId: "input", terminalId: "out" }, to: { componentId: "edge", terminalId: "in" }, points: [], netName: "INPUT" },
      { id: "w2", from: { componentId: "edge", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [], netName: "PULSE" },
    ];
    const output = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "K1")!.output.value;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(output()).toBe("OFF");
    runtime.components[0].properties.input = kind === "positive";
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(output()).toBe("ON");
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(output()).toBe("OFF");
    runtime.components[0].properties.input = kind === "negative";
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(output()).toBe("OFF");
    runtime.components[0].properties.input = kind === "positive";
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(output()).toBe("ON");
  });
  it.each(["set", "reset"])("retains the %s latch state after its command is released", (kind) => {
    const design = structuredClone(templateLibrary[3].document);
    design.components = [{ id: "latch", definitionId: `logic.${kind}-coil`, reference: "K1", x: 100, y: 100, rotation: 0, properties: { previous: kind === "reset", input: true } }];
    design.wires = [];
    let runtime = advanceCircuitClock(design, catalogById, 0.1);
    runtime.components[0].properties.input = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(executeCircuitModels(runtime, catalogById)[0].output.value).toBe(kind === "set" ? "ON" : "OFF");
    const reset = resetCircuitClock(runtime, catalogById);
    expect(reset.components[0].properties.runtimePrevious).toBeUndefined();
    expect(executeCircuitModels(reset, catalogById)[0].output.value).toBe(kind === "set" ? "OFF" : "ON");
    expect(design.components[0].properties.runtimePrevious).toBeUndefined();
  });
  it("uses the wired coil signal for timing and drops the actuator on signal loss", () => {
    const design = structuredClone(templateLibrary[3].document);
    const timer = design.components[0];
    timer.properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
    design.components[2].properties.returnSpring = true;
    design.components.push({ id: "timer-enable", definitionId: "logic.no-contact", reference: "S2", x: 100, y: 600, rotation: 0, properties: { input: false } });
    design.wires.push({ id: "timer-enable-wire", from: { componentId: "timer-enable", terminalId: "out" }, to: { componentId: timer.id, terminalId: "a1" }, points: [], netName: "ENABLE" });
    let runtime = advanceCircuitClock(design, catalogById, 2);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    runtime.components.at(-1)!.properties.input = true;
    runtime = advanceCircuitClock(runtime, catalogById, 0.5);
    expect(actuator()).toBe("RETRACTED");
    runtime = advanceCircuitClock(runtime, catalogById, 0.5);
    expect(actuator()).toContain("EXTENDED");
    runtime.components.at(-1)!.properties.input = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    expect(timer.properties.elapsedSeconds).toBe(0);
  });
  it("expires at the exact threshold after ten 100 ms steps", () => {
    let runtime = structuredClone(templateLibrary[3].document);
    runtime.components[0].properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
    for (let index = 0; index < 10; index++) runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(1);
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "KT1")?.output.value).toBe("CLOSED");
  });
  it("resets runtime timing while preserving configured design values", () => {
    const design = structuredClone(templateLibrary[3].document);
    design.components[0].properties.elapsedSeconds = 9;
    const runtime = resetCircuitClock(design, catalogById);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(design.components[0].properties.elapsedSeconds).toBe(9);
    expect(runtime.components[0].properties.delaySeconds).toBe(design.components[0].properties.delaySeconds);
  });
  it("accumulates timer time, switches the wired actuator, and resets on power loss", () => {
    const design = structuredClone(templateLibrary[3].document);
    design.components[0].properties = { energized: true, delaySeconds: 2, elapsedSeconds: 0 };
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 1);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toBe("RETRACTED");
    runtime = advanceCircuitClock(runtime, catalogById, 1);
    expect(actuator()).toContain("EXTENDED");
    runtime.components[0].properties.energized = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    expect(design.components[0].properties.elapsedSeconds).toBe(0);
  });
  it("rejects invalid clock steps", () => {
    for (const delta of [-1, NaN, Infinity]) expect(() => advanceCircuitClock(templateLibrary[3].document, catalogById, delta)).toThrow();
  });
});
