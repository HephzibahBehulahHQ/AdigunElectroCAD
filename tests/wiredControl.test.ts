import { createContactorStatusPanelProject } from "../src/projects/contactorStatusPanelProject";
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
  const { document } = createContactorStatusPanelProject();
  const component = document.components.find(({ id }) => id === "contactor")!;
  component.definitionId = "iec.interface-relay.02";
  component.properties = { coilVoltageV: 24, coilDc: true, changeoverContacts: 2 };
  const acLamp = document.components.find(({ id }) => id === "picked-up")!;
  acLamp.properties = { ...acLamp.properties, ratedVoltageV: 230, dc: false };
  const wire = (id: string) => document.wires.find((item) => item.id === id)!;
  wire("no-feed").from = { componentId: "ac", terminalId: "line" };
  wire("no-feed").to.terminalId = "21";
  wire("picked-up-feed").from.terminalId = "24";
  wire("picked-up-return").to = { componentId: "ac", terminalId: "neutral" };
  wire("nc-feed").to.terminalId = "11";
  wire("dropped-out-feed").from.terminalId = "12";

  const idle = evaluateWiredControl(document, catalogById);
  expect(idle.get("contactor")).toEqual({ energized: false, voltageV: 0 });
  expect(idle.get("dropped-out")).toEqual({ energized: true, voltageV: 24 });
  expect(idle.get("picked-up")).toEqual({ energized: false, voltageV: 0 });

  const closed = press(document, "command", true);
  const active = evaluateWiredControl(closed, catalogById);
  expect(active.get("contactor")).toEqual({ energized: true, voltageV: 24 });
  expect(active.get("picked-up")).toEqual({ energized: true, voltageV: 230 });
  expect(active.get("dropped-out")).toEqual({ energized: false, voltageV: 0 });
  expect(executeCircuitModels(closed, catalogById)).toContainEqual(expect.objectContaining({
    reference: "KM1", output: expect.objectContaining({ value: "ENERGIZED · 2 CO" }),
  }));

  const openReturn = { ...closed, wires: closed.wires.filter(({ id }) => id !== "coil-return") };
  expect(evaluateWiredControl(openReturn, catalogById).get("contactor")).toEqual({ energized: false, voltageV: 0 });
  expect(evaluateWiredControl(openReturn, catalogById).get("dropped-out")).toEqual({ energized: true, voltageV: 24 });
});
