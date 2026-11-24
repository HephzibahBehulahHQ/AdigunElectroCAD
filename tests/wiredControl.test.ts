import { createMixedVoltageRelayPanelProject } from "../src/projects/mixedVoltageRelayPanelProject";
import { createWiredHoldingTemplate } from "../src/projects/wiredHoldingCircuit";
import { verifyProjectTemplate } from "../src/projects/templateVerification";
import { expect, it } from "vitest";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { catalogById } from "../src/catalog/dolCatalog";
import { evaluateWiredControl } from "../src/simulation/wiredControl";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { createTransformerPilotProject } from "../src/projects/transformerPilotProject";

it("applies the transformer ratio only through a complete primary and secondary", () => {
  const { document } = createTransformerPilotProject();
  const closed = press(document, "start", true);
  const lamp = (sheet: typeof document) => evaluateWiredControl(sheet, catalogById).get("lamp");
  expect(lamp(closed)).toEqual({ energized: true, voltageV: 24 });
  for (const id of ["switched-line", "neutral", "secondary-a", "secondary-b"]) {
    expect(lamp({ ...closed, wires: closed.wires.filter(wire => wire.id !== id) })).toMatchObject({ energized: false, voltageV: 0 });
  }
  const reduced = { ...closed, components: closed.components.map(component => component.id === "supply"
    ? { ...component, properties: { ...component.properties, voltageV: 115 } }
    : component) };
  expect(lamp(reduced)).toMatchObject({ energized: false, voltageV: 12 });
});

const design = () => ({ ...createDolMotorStarter(), id: "editable-wired-control" });
const coil = (document: ReturnType<typeof design>) => evaluateWiredControl(document, catalogById).get("contactor")!;
const press = (document: ReturnType<typeof design>, id: string, pressed: boolean) => setCircuitBooleanInput(document, catalogById, id, "pressed", pressed);

it("executes START, wired holding, STOP and release without restarting", () => {
  const saved = design();
  let runtime = press(saved, "start", true);
  expect(coil(runtime)).toEqual({ energized: true, voltageV: 230 });
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  runtime = press(runtime, "start", false);
  expect(coil(runtime).energized).toBe(true);
  runtime = press(runtime, "stop", true);
  expect(coil(runtime).energized).toBe(false);
  runtime = press(runtime, "stop", false);
  expect(coil(runtime).energized).toBe(false);
  expect(saved.components.find(c => c.id === "contactor")!.properties.runtimeCoilEnergized).toBeUndefined();
  expect(coil(resetCircuitClock(runtime, catalogById)).energized).toBe(false);
});

it.each(["w18", "w19", "w20"])("requires actual return and holding wire %s", wire => {
  let runtime = design();
  runtime.wires = runtime.wires.filter(w => w.id !== wire);
  runtime = press(runtime, "start", true);
  expect(coil(runtime).energized).toBe(wire !== "w18");
  runtime = press(runtime, "start", false);
  expect(coil(runtime).energized).toBe(false);
});

it("drops the retained coil on a brief overload trip before another clock tick", () => {
  let runtime = press(design(), "start", true);
  runtime = press(runtime, "start", false);
  runtime = setCircuitBooleanInput(runtime, catalogById, "overload", "tripped", true);
  expect(coil(runtime).energized).toBe(false);
  runtime = setCircuitBooleanInput(runtime, catalogById, "overload", "tripped", false);
  expect(coil(runtime).energized).toBe(false);
});

it("rejects nominal voltage mismatch and cannot energize from a configured Boolean", () => {
  const runtime = design();
  const contactor = runtime.components.find(c => c.id === "contactor")!;
  contactor.properties.energized = true;
  expect(coil(runtime).energized).toBe(false);
  contactor.properties.coilVoltageV = 24;
  const started = press(runtime, "start", true);
  expect(coil(started)).toMatchObject({ energized: false, voltageV: 230, error: expect.any(String) });
  expect(executeCircuitModels(started, catalogById).find(r => r.componentId === "contactor")!.output.error).toContain("coil rating");
});

it("inhibits a control circuit with line and neutral shorted", () => {
  const runtime = design();
  runtime.wires.push({ id: "short", from: { componentId: "control", terminalId: "line" }, to: { componentId: "control", terminalId: "neutral" }, points: [], netName: "FAULT" });
  expect(coil(press(runtime, "start", true))).toMatchObject({ energized: false, error: expect.stringContaining("shorted") });
});

it("runs the dedicated wired starter operating sequence", () => {
  const result = verifyProjectTemplate(createWiredHoldingTemplate(), catalogById);
  expect(result.topologyIssues).toEqual([]);
  expect(result.failedExpectations).toEqual([]);
  expect(result.passed).toBe(true);
});

it("drives isolated AC and DC loads from separate poles of a physically wired relay", () => {
  const { document } = createMixedVoltageRelayPanelProject();

  const idle = evaluateWiredControl(document, catalogById);
  expect(idle.get("relay")).toEqual({ energized: false, voltageV: 0 });
  expect(idle.get("dropped-out")).toEqual({ energized: true, voltageV: 24 });
  expect(idle.get("picked-up")).toEqual({ energized: false, voltageV: 0 });

  const closed = press(document, "command", true);
  const active = evaluateWiredControl(closed, catalogById);
  expect(active.get("relay")).toEqual({ energized: true, voltageV: 24 });
  expect(active.get("picked-up")).toEqual({ energized: true, voltageV: 230 });
  expect(active.get("dropped-out")).toEqual({ energized: false, voltageV: 0 });
  expect(executeCircuitModels(closed, catalogById)).toContainEqual(expect.objectContaining({
    reference: "K1", output: expect.objectContaining({ value: "ENERGIZED · 2 CO" }),
  }));

  const openReturn = { ...closed, wires: closed.wires.filter(({ id }) => id !== "coil-return") };
  expect(evaluateWiredControl(openReturn, catalogById).get("relay")).toEqual({ energized: false, voltageV: 0 });
  expect(evaluateWiredControl(openReturn, catalogById).get("dropped-out")).toEqual({ energized: true, voltageV: 24 });
});

it("passes continuity in either direction on each PTTB level and isolates the levels", () => {
  const base = press(createTransformerPilotProject().document, "start", true);
  const secondary = base.wires.find(wire => wire.id === "secondary-a")!;
  const component = { id: "pttb", definitionId: "phoenix-contact.pttb.3210567", reference: "X2", x: 500, y: 500, rotation: 0 as const, properties: {} };
  const run = (entry: string, exit: string) => evaluateWiredControl({
    ...base,
    components: [...base.components, component],
    wires: [
      ...base.wires.filter(wire => wire !== secondary),
      { ...secondary, id: "pttb-entry", to: { componentId: component.id, terminalId: entry } },
      { ...secondary, id: "pttb-exit", from: { componentId: component.id, terminalId: exit } },
    ],
  }, catalogById).get("lamp");
  expect(run("upper-left", "upper-right")).toEqual({ energized: true, voltageV: 24 });
  expect(run("lower-right", "lower-left")).toEqual({ energized: true, voltageV: 24 });
  expect(run("upper-left", "lower-right")).toMatchObject({ energized: false, voltageV: 0 });
  expect(run("lower-right", "upper-left")).toMatchObject({ energized: false, voltageV: 0 });
});

it("transfers the Finder relay common between NC 12 and NO 14", () => {
  const { document } = createMixedVoltageRelayPanelProject();
  const definition = catalogById.get("finder.38.51.7.024.0050")!;
  document.components = document.components.map(component => component.id === "relay"
    ? { ...component, definitionId: definition.id, properties: definition.propertiesSchema }
    : component.id === "picked-up" ? { ...component, properties: { ...component.properties, ratedVoltageV: 24, dc: true } } : component);
  document.wires = document.wires.filter(wire => wire.id !== "no-feed").map(wire => {
    if (wire.id === "picked-up-feed") return { ...wire, from: { componentId: "relay", terminalId: "14" } };
    if (wire.id === "picked-up-return") return { ...wire, to: { componentId: "dc", terminalId: "zero-out" }, netName: "DC_RETURN" };
    return wire;
  });
  const states = (pressed: boolean) => {
    const result = evaluateWiredControl(press(document, "command", pressed), catalogById);
    return ["relay", "picked-up", "dropped-out"].map(id => result.get(id)?.energized);
  };
  expect(states(false)).toEqual([false, false, true]);
  expect(states(true)).toEqual([true, true, false]);
});
