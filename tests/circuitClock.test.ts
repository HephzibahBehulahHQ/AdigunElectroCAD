import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { templateFixtures } from "../src/projects/templateLibrary";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput, setCircuitClimateInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { validateCircuit } from "../src/electrical/topology";
import type { CircuitDocument } from "../src/types/electrical";

describe("circuit simulation clock", () => {
  it.each([
    ["hvac.thermostat", "temperatureC", 19, 21, 23],
    ["hvac.humidistat", "humidityPercent", 65, 60, 55],
  ] as const)("wires %s to a coil and retains its deadband across scans", (definitionId, measurement, demand, deadband, release) => {
    const design: CircuitDocument = {
      id: "climate-control", name: "Climate control", description: "Wired enable and demand", revision: 1,
      components: [
        { id: "enable", reference: "S1", definitionId: "logic.no-contact", x: 150, y: 200, rotation: 0, properties: { input: true } },
        { id: "sensor", reference: "B1", definitionId, x: 350, y: 200, rotation: 0, properties: { [measurement]: demand } },
        { id: "coil", reference: "K1", definitionId: "logic.output-coil", x: 550, y: 200, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "enable-wire", from: { componentId: "enable", terminalId: "out" }, to: { componentId: "sensor", terminalId: "in" }, points: [] },
        { id: "demand-wire", from: { componentId: "sensor", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
      ],
    };
    expect(validateCircuit(design, catalogById)).toEqual([]);
    let runtime = advanceCircuitClock(design, catalogById, 0.1);
    const coil = () => executeCircuitModels(runtime, catalogById).find(({ componentId }) => componentId === "coil")?.output.value;
    const sample = (value: number) => {
      runtime = advanceCircuitClock(setCircuitClimateInput(runtime, catalogById, "sensor", value), catalogById, 0.1);
    };
    expect(coil()).toBe("ON");
    sample(deadband);
    expect(coil()).toBe("ON");
    sample(release);
    sample(deadband);
    expect(coil()).toBe("OFF");
    runtime = setCircuitBooleanInput(runtime, catalogById, "enable", "input", false);
    sample(demand);
    expect(coil()).toBe("OFF");
    expect(design.components[1].properties).toEqual({ [measurement]: demand });
    expect(resetCircuitClock(runtime, catalogById).components[1].properties.runtimeClimateContact).toBeUndefined();
    expect(() => setCircuitClimateInput(runtime, catalogById, "sensor", -274)).toThrow();
    expect(() => setCircuitClimateInput(runtime, catalogById, "sensor", Infinity)).toThrow();
    expect(() => setCircuitClimateInput(runtime, catalogById, "coil", demand)).toThrow();
    if (measurement === "humidityPercent") expect(() => setCircuitClimateInput(runtime, catalogById, "sensor", 101)).toThrow();
  });

  it("scans wired PLC inputs, retains Q0, and fails closed on a program error", () => {
    const design = structuredClone(templateFixtures[2].document);
    const plc = design.components[1];
    plc.properties = { program: "LD I0; OR Q0; ANDN I1; OUT Q0", inputB: false, output: false };
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 0.1);
    expect(JSON.parse(String(runtime.components[1].properties.runtimeScanTrace))).toMatchObject([{ scan: 1, elapsedSeconds: 0.1, status: "ok", output: true }]);
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
    expect(JSON.parse(String(runtime.components[1].properties.runtimeScanTrace)).at(-1)).toMatchObject({ scan: 4, status: "error", output: false, message: "Unsupported operation: INVALID" });
    expect(resetCircuitClock(runtime, catalogById).components[1].properties.runtimeQ0).toBeUndefined();
    expect(resetCircuitClock(runtime, catalogById).components[1].properties.runtimeScanTrace).toBeUndefined();
    expect(plc.properties.runtimeQ0).toBeUndefined();
    expect(design.components[0].properties.detected).toBe(true);
    for (const property of ["program", "runtimeQ0", "missing"]) expect(() => setCircuitBooleanInput(runtime, catalogById, plc.id, property, true)).toThrow();
  });
  it.each(["positive", "negative"])("emits a single wired %s edge pulse per transition", (kind) => {
    let runtime = structuredClone(templateFixtures[3].document);
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
    const design = structuredClone(templateFixtures[3].document);
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
    const design = structuredClone(templateFixtures[3].document);
    const timer = design.components[0];
    timer.properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
    const source = design.components.find((component) => component.reference === "S1")!;
    source.properties.input = false;
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 2);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    runtime.components.find((component) => component.reference === "S1")!.properties.input = true;
    runtime = advanceCircuitClock(runtime, catalogById, 0.5);
    expect(actuator()).toBe("RETRACTED");
    runtime = advanceCircuitClock(runtime, catalogById, 0.5);
    expect(actuator()).toContain("EXTENDED");
    runtime.components.find((component) => component.reference === "S1")!.properties.input = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    expect(timer.properties.elapsedSeconds).toBe(0);
  });
  it("expires at the exact threshold after ten 100 ms steps", () => {
    let runtime = structuredClone(templateFixtures[3].document);
    runtime.components[0].properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
    for (let index = 0; index < 10; index++) runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(1);
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "KT1")?.output.value).toBe("CLOSED");
  });
  it("resets runtime timing while preserving configured design values", () => {
    const design = structuredClone(templateFixtures[3].document);
    design.components[0].properties.elapsedSeconds = 9;
    const runtime = resetCircuitClock(design, catalogById);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(design.components[0].properties.elapsedSeconds).toBe(9);
    expect(runtime.components[0].properties.delaySeconds).toBe(design.components[0].properties.delaySeconds);
  });
  it("accumulates timer time, switches the wired actuator, and resets on power loss", () => {
    const design = structuredClone(templateFixtures[3].document);
    design.components[0].properties = { energized: true, delaySeconds: 2, elapsedSeconds: 0 };
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 1);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toBe("RETRACTED");
    runtime = advanceCircuitClock(runtime, catalogById, 1);
    expect(actuator()).toContain("EXTENDED");
    runtime.components.find((component) => component.reference === "S1")!.properties.input = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    expect(design.components[0].properties.elapsedSeconds).toBe(0);
  });
  it("rejects invalid clock steps", () => {
    for (const delta of [-1, NaN, Infinity]) expect(() => advanceCircuitClock(templateFixtures[3].document, catalogById, delta)).toThrow();
  });
});

