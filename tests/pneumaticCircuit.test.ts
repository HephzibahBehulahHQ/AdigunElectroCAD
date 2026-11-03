import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { createPneumaticCircuit, createPneumaticProject } from "../src/projects/pneumaticCircuit";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { advanceCylinder, valve52Direction } from "../src/simulation/pneumaticState";
import { terminalAnchors } from "../src/components/Schematic";

it("runs a wired bistable valve, cylinder motion and position feedback with Pause/Stop", () => {
  const design = createPneumaticCircuit(), original = JSON.stringify(design);
  expect(validateCircuit(design, catalogById)).toEqual([]);
  let runtime = resetCircuitClock(design, catalogById);
  const position = () => Number(executeCircuitModels(runtime, catalogById).find((r) => r.componentId === "cylinder")!.evaluatedProperties.runtimePositionPercent ?? 0);
  const output = () => executeCircuitModels(runtime, catalogById).find((r) => r.componentId === "indicator")!.output.value;
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 1);
  expect(position()).toBe(25);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", false);
  runtime = advanceCircuitClock(runtime, catalogById, 2);
  expect(position()).toBe(75);
  expect(output()).toBe("OFF");
  expect(runtime.components.find((c) => c.id === "valve")!.properties.runtimeSpool).toBe("extend");
  expect(advanceCircuitClock(runtime, catalogById, 0)).toEqual(runtime);
  runtime = advanceCircuitClock(runtime, catalogById, .5);
  expect(position()).toBe(87.5);
  expect(output()).toBe("ON");
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-retract", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 1);
  expect(runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBe(87.5);
  expect(output()).toContain("ERROR:");
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", false);
  runtime = advanceCircuitClock(runtime, catalogById, .5);
  expect(position()).toBe(75);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-retract", "input", false);
  runtime = advanceCircuitClock(runtime, catalogById, 10);
  expect(position()).toBe(0);
  const reset = resetCircuitClock(runtime, catalogById);
  expect(reset.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBeUndefined();
  expect(reset.components.find((c) => c.id === "valve")!.properties.runtimeSpool).toBeUndefined();
  expect(JSON.stringify(design)).toBe(original);
});

it("extends a wired single-acting cylinder and retracts it when the 3/2 coil drops", () => {
  const design = createPneumaticCircuit(true);
  design.components.find((c) => c.id === "valve")!.properties.energized = true;
  const original = JSON.stringify(design);
  let runtime = advanceCircuitClock(design, catalogById, 1);
  const position = () => runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent;
  expect(position()).toBe(0); // Wired false overrides the configured true coil.
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 2);
  expect(position()).toBe(50);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", false);
  runtime = advanceCircuitClock(runtime, catalogById, 1);
  expect(position()).toBe(25);
  runtime = advanceCircuitClock(runtime, catalogById, 10);
  expect(position()).toBe(0);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 10);
  expect(position()).toBe(100);
  expect(design.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBeUndefined();
  expect(JSON.stringify(design)).toBe(original);
});

it.each([false, true])("retains compatible direct command terminals for single acting = %s", (single) => {
  const document = createPneumaticCircuit(single);
  document.components.find((c) => c.id === "cylinder")!.properties = { positionPercent: 50, direction: "extend", travelSeconds: 4 };
  document.wires = document.wires.filter((w) => w.to.componentId !== "cylinder");
  document.wires.push({ id: "direct", from: { componentId: "command-extend", terminalId: "out" }, to: { componentId: "cylinder", terminalId: single ? "in" : "in-a" }, points: [] });
  expect(validateCircuit(document, catalogById)).toEqual([]);
  let runtime = advanceCircuitClock(document, catalogById, 1);
  expect(runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBe(single ? 25 : 50);
  runtime = setCircuitBooleanInput(runtime, catalogById, "command-extend", "input", true);
  runtime = advanceCircuitClock(runtime, catalogById, 1);
  expect(runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBe(single ? 50 : 75);
});

it("rejects incompatible motion/Boolean wires and reports ambiguous command paths", () => {
  const document = createPneumaticCircuit();
  expect(canConnectTerminals(document, catalogById, { componentId: "valve", terminalId: "out" }, { componentId: "indicator", terminalId: "in" }).ok).toBe(false);
  expect(canConnectTerminals(document, catalogById, { componentId: "command-extend", terminalId: "out" }, { componentId: "cylinder", terminalId: "motion" }).ok).toBe(false);
  document.wires.push({ id: "ambiguous", from: { componentId: "command-extend", terminalId: "out" }, to: { componentId: "cylinder", terminalId: "in-a" }, points: [] });
  const runtime = advanceCircuitClock(document, catalogById, 1);
  expect(executeCircuitModels(runtime, catalogById).find((r) => r.componentId === "cylinder")!.output.value).toContain("Choose a valve-motion input");
  expect(runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBeUndefined();
});

it("validates initial conditions and preserves the legacy preset elapsed-time snapshot", () => {
  expect(advanceCylinder({ positionPercent: 50, direction: "extend", elapsedSeconds: 1, travelSeconds: 4 }, false, 1)).toBe(100);
  for (const properties of [{ positionPercent: -1 }, { travelSeconds: 0 }, { elapsedSeconds: -1 }, { direction: "unknown" }]) expect(() => advanceCylinder(properties, false, 1)).toThrow();
  expect(() => valve52Direction({ initialPosition: "hold" })).toThrow();
  expect(() => valve52Direction({ extendCoil: true, retractCoil: true })).toThrow();
  for (const single of [false, true]) expect(parseProjectJson(JSON.stringify(createPneumaticProject(single)))).toEqual(createPneumaticProject(single));
});

it("does not fall back to manual motion when an incompatible signal arrives through COM", () => {
  const document = createPneumaticCircuit();
  document.components.find((c) => c.id === "cylinder")!.properties = { positionPercent: 50, direction: "extend", travelSeconds: 4 };
  document.wires = document.wires.filter((w) => w.to.componentId !== "cylinder");
  document.wires.push(
    { id: "bad-unit-1", from: { componentId: "command-extend", terminalId: "out" }, to: { componentId: "cylinder", terminalId: "common" }, points: [] },
    { id: "bad-unit-2", from: { componentId: "cylinder", terminalId: "common" }, to: { componentId: "cylinder", terminalId: "motion" }, points: [] },
  );
  const runtime = advanceCircuitClock(document, catalogById, 1);
  expect(runtime.components.find((c) => c.id === "cylinder")!.properties.runtimePositionPercent).toBeUndefined();
  expect(executeCircuitModels(runtime, catalogById).find((r) => r.componentId === "cylinder")!.output.value).toContain("Signal unit boolean is not accepted");
});

it("places distinct command terminals on the body boundary and rotates them with the symbol", () => {
  for (const single of [false, true]) {
    const document = createPneumaticCircuit(single);
    for (const component of document.components) {
      const anchors = terminalAnchors(document).filter((a) => a.endpoint.componentId === component.id);
      expect(new Set(anchors.map((a) => `${a.x},${a.y}`)).size).toBe(anchors.length);
      const output = anchors.find((a) => a.endpoint.terminalId === "out")!;
      expect(output.x).toBe(component.x + 47);
      expect(output.y).toBe(component.y);
    }
    const cylinder = document.components.find((c) => c.id === "cylinder")!;
    const motion = () => terminalAnchors(document).find((a) => a.endpoint.componentId === cylinder.id && a.endpoint.terminalId === "motion")!;
    const initial = motion();
    for (const rotation of [90, 180, 270] as const) {
      cylinder.rotation = rotation;
      const dx = initial.x - cylinder.x, dy = initial.y - cylinder.y;
      expect(motion()).toMatchObject({ x: cylinder.x + (rotation === 90 ? -dy : rotation === 180 ? -dx : dy), y: cylinder.y + (rotation === 90 ? dx : rotation === 180 ? -dy : -dx) });
    }
  }
});
