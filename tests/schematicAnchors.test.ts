Warning: truncated output (original token count: 8465)
Total output lines: 512

import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogById } from "../src/catalog/dolCatalog";
import { Schematic, terminalAnchors } from "../src/components/Schematic";
import type { ProjectContinuation } from "../src/types/electrical";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";
import { createStarDeltaCircuit } from "../src/projects/starDeltaCircuit";
import { createReversingCircuit } from "../src/projects/reversingCircuit";
import { initialDolState } from "../src/simulation/dolSimulator";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createSourcedDolMotorStarter } from "../src/projects/sourcedDolMotorStarter";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders a user-selected component name beside its editable indication", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  const lamp = { id: "named-lamp", definitionId: "user.indicator-lamp", reference: "H1", x: 500, y: 350, rotation: 0 as const, displayName: "Pump room", properties: { indication: "Ready" }, terminalLabels: { t1: "LEFT" } };
  document.components.push(lamp);
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: lamp.id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain("Pump room · Ready");
  expect(markup).toContain(">LEFT</text>");
});

it("shows a user terminal label while preserving the real endpoint identity", () => {
  const document = createStarDeltaCircuit();
  const component = document.components[0];
  const terminalId = catalogById.get(component.definitionId)!.terminals[0].id;
  component.terminalLabels = { [terminalId]: "LINE+" };
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: component.id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain('class="free-terminal-label">LINE+</text>');
  expect(terminalAnchors(document).some((anchor) => anchor.endpoint.componentId === component.id && anchor.endpoint.terminalId === terminalId)).toBe(true);
});

it("renders modeled proximity sensors with reachable power, signal and common pins", () => {
  const definition = catalogById.get("iec.proximity-sensor.01")!;
  const component = { id: "B1", definitionId: definition.id, reference: "B1", x: 300, y: 300, rotation: 0 as const, properties: {} };
  const document = { id: "sensor-sheet", name: "Sensor wiring", description: "", revision: 1, components: [component], wires: [] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const pin = anchors.find((item) => item.endpoint.componentId === component.id && item.endpoint.terminalId === terminalId)!;
    return [pin.x - component.x, pin.y - component.y];
  };
  expect(definition.symbolId).toMatch(/^sensor-\d+$/);
  expect(relative("supply")).toEqual([-47, -14]);
  expect(relative("signal")).toEqual([47, 0]);
  expect(relative("common")).toEqual([-47, 14]);
  const symbol = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: component.x, y: component.y }));
  expect(symbol).toContain("Inductive proximity sensor with +24V, SIG and 0V terminals");
});

it("keeps connection pins visible on the sheet and larger in wire mode", () => {
  const document = createReversingCircuit();
  const render = (wireMode: boolean) => renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(render(false)).toContain('r="5" class="terminal-pin"');
  expect(render(true)).toContain('r="7" class="terminal-anchor"');
});

it("lays out every documented PNOZ terminal outside its module symbol", () => {
  const definition = catalogById.get("iec.safety-relay.01")!;
  const component = { id: "SR1", definitionId: definition.id, reference: "SR1", x: 300, y: 300, rotation: 0 as const, properties: definition.propertiesSchema };
  const document = { id: "safety-relay-sheet", name: "Safety relay", description: "", revision: 1, components: [component], wires: [] };
  const anchors = terminalAnchors(document).filter((pin) => pin.endpoint.componentId === component.id);
  expect(anchors).toHaveLength(16);
  expect(new Set(anchors.map((pin) => `${pin.x}:${pin.y}`)).size).toBe(16);
  const symbol = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: component.x, y: component.y }));
  expect(symbol).toContain("PNOZ X2.7P safety relay");
  expect(symbol).toContain("PNOZ X2.7P");
});

it("renders anchors for every free-sheet wire even when component IDs match the reference sheet", () => {
  for (const document of [createStarDeltaCircuit(), createReversingCircuit()]) {
    const endpoints = new Set(terminalAnchors(document).map((anchor) => `${anchor.endpoint.componentId}.${anchor.endpoint.terminalId}`));
    for (const wire of document.wires) for (const endpoint of [wire.from, wire.to]) expect(endpoints.has(`${endpoint.componentId}.${endpoint.terminalId}`)).toBe(true);
  }
});

it("places all six motor winding terminals outside the IEC motor symbol body", () => {
  const document = createStarDeltaCircuit();
  const motor = document.components.find((component) => component.definitionId === "motor.six-terminal")!;
  const anchors = terminalAnchors(document).filter((anchor) => anchor.endpoint.componentId === motor.id);
  expect(anchors.filter((anchor) => ["u1", "v1", "w1"].includes(anchor.endpoint.terminalId)).map(({ x, y }) => [x - motor.x, y - motor.y])).toEqual([[-30, -42], [0, -42], [30, -42]]);
  expect(anchors.filter((anchor) => ["u2", "v2", "w2"].includes(anchor.endpoint.terminalId)).map(({ x, y }) => [x - motor.x, y - motor.y])).toEqual([[-30, 42], [0, 42], [30, 42]]);
  expect(anchors.find((anchor) => anchor.endpoint.terminalId === "pe")).toMatchObject({ x: motor.x - 47, y: motor.y });
});

it("aligns breaker and overload phase anchors with the dedicated three-pole symbols", () => {
  const document = createReversingCircuit();
  const breaker = document.components.find((component) => component.id === "breaker")!;
  const overload = document.components.find((component) => component.id === "overload-control")!;
  const anchors = terminalAnchors(document);
  const relative = (componentId: string, terminalId: string) => {
    const found = anchors.find((item) => item.endpoint.componentId === componentId && item.endpoint.terminalId === terminalId)!;
    const component = document.components.find((item) => item.id === componentId)!;
    return [found.x - component.x, found.y - component.y];
  };
  expect(relative(breaker.id, "l1-in")).toEqual([-32, -27]);
  expect(relative(breaker.id, "l2-in")).toEqual([0, -27]);
  expect(relative(breaker.id, "l3-in")).toEqual([32, -27]);
  expect(relative(breaker.id, "l1-out")).toEqual([-32, 27]);
  expect(relative(breaker.id, "l2-out")).toEqual([0, 27]);
  expect(relative(breaker.id, "l3-out")).toEqual([32, 27]);
  expect(relative(overload.id, "l1-in")).toEqual([-32, -27]);
  expect(relative(overload.id, "t2")).toEqual([0, 27]);
  expect(relative(overload.id, "t3")).toEqual([32, 27]);
  expect(relative(overload.id, "aux-95")).toEqual([-47, -12]);
  expect(relative(overload.id, "aux-96")).toEqual([-47, 12]);
  expect(relative(overload.id, "aux-97")).toEqual([47, -12]);
  expect(relative(overload.id, "aux-98")).toEqual([47, 12]);
});

it("keeps scaled symbol terminals connected to the scaled canvas instance", () => {
  const document = { id: "free", name: "Free", description: "", revision: 0, wires: [], components: [
    { id: "motor", definitionId: "motor.six-terminal", reference: "M1", x: 300, y: 300, rotation: 0 as const, size: 1.5, properties: {} },
  ] };
  const anchors = terminalAnchors(document);
  expect(anchors.find((item) => item.endpoint.terminalId === "u1")).toMatchObject({ x: 255, y: 237 });
  expect(anchors.find((item) => item.endpoint.terminalId === "v1")).toMatchObject({ x: 300, y: 237 });
});

it("renders breaker and overload symbols with their real open/closed and trip states", () => {
  for (const symbolId of ["breaker", "breaker-3p", "overload-3p"]) expect(hasDedicatedFunctionalSymbol(symbolId)).toBe(true);
  const breakerOpen = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "breaker-3p", x: 100, y: 100, properties: { closed: false } }));
  const breakerClosed = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "breaker", x: 100, y: 100, properties: { closed: true } }));
  const overloadHealthy = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "overload-3p", x: 100, y: 100, properties: { tripped: false } }));
  const overloadTripped = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "overload-3p", x: 100, y: 100, properties: { tripped: true } }));
  expect(breakerOpen).toContain('aria-label="Three-pole circuit breaker, open"');
  expect(breakerClosed).toContain('data-state="closed"');
  expect(breakerClosed).not.toEqual(breakerOpen);
  expect(overloadHealthy).toContain('data-state="healthy"');
  expect(overloadTripped).toContain('data-state="tripped"');
  expect(overloadTripped).not.toEqual(overloadHealthy);
});



it("renders three connected zigzag heater poles and shows the tripped …3465 tokens truncated…toEqual([47, 12]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 420, y: 300, properties: { energized: true, elapsedSeconds: 2, delaySeconds: 2 } }));
  expect(svg).toContain('aria-label="On-delay timer, timed contact made"');
  expect(svg).toContain('data-state="timed"');
});

it("positions VFD line, motor, and earth terminals beside its dedicated symbol", () => {
  const definition = catalogById.get("iec.variable-frequency-drive.01")!;
  const document = { id: "drive-sheet", name: "Drive", description: "", revision: 0, wires: [], components: [
    { id: "u1", definitionId: definition.id, reference: "U1", x: 450, y: 320, rotation: 0 as const, properties: {} },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 450, anchor.y - 320];
  };
  expect(relative("l1-in")).toEqual([-47, -20]);
  expect(relative("l3-in")).toEqual([-47, 20]);
  expect(relative("u1")).toEqual([47, -20]);
  expect(relative("w1")).toEqual([47, 20]);
  expect(relative("pe")).toEqual([0, 35]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 450, y: 320 }));
  expect(svg).toContain('aria-label="Variable-frequency drive with three-phase input and U/V/W output"');
});

it("positions all PLC I/O terminals around a dedicated module symbol", () => {
  const definition = catalogById.get("iec.plc-digital-io.01")!;
  const document = { id: "plc-sheet", name: "PLC", description: "", revision: 0, wires: [], components: [
    { id: "plc1", definitionId: definition.id, reference: "PLC1", x: 500, y: 340, rotation: 0 as const, properties: {} },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 500, anchor.y - 340];
  };
  expect(relative("in-0")).toEqual([-47, -22]);
  expect(relative("in-1")).toEqual([-47, -7]);
  expect(relative("ai-0")).toEqual([-47, 8]);
  expect(relative("ai-1")).toEqual([-47, 23]);
  expect(relative("out-0")).toEqual([47, -12]);
  expect(relative("out-1")).toEqual([47, 7]);
  expect(relative("common")).toEqual([47, 25]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 500, y: 340 }));
  expect(svg).toContain('aria-label="PLC digital and analog I/O module"');
  expect(svg).toContain(">I</text>");
  expect(svg).toContain(">Q</text>");
});

it("positions transformer primary and secondary pins around a dedicated winding symbol", () => {
  const definition = catalogById.get("iec.control-transformer.01")!;
  const document = { id: "transformer-sheet", name: "Transformer", description: "", revision: 0, wires: [], components: [
    { id: "t1", definitionId: definition.id, reference: "T1", x: 400, y: 300, rotation: 0 as const, properties: {} },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 400, anchor.y - 300];
  };
  expect(relative("p1")).toEqual([-47, -12]);
  expect(relative("p2")).toEqual([-47, 12]);
  expect(relative("s1")).toEqual([47, -12]);
  expect(relative("s2")).toEqual([47, 12]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 400, y: 300 }));
  expect(svg).toContain('aria-label="Transformer with primary and secondary windings"');
  expect(svg).toContain("C 378 276");
});

it("renders a connectable three-pole fuse switch with its three real pole anchors", () => {
  const definition = catalogById.get("iec.fuse-switch.01")!;
  const document = { id: "fuse-sheet", name: "Fuse", description: "", revision: 0, wires: [], components: [
    { id: "f1", definitionId: definition.id, reference: "F1", x: 320, y: 260, rotation: 0 as const, properties: { fuseHealthy: false } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 320, anchor.y - 260];
  };
  expect(relative("l1-in")).toEqual([-32, -27]);
  expect(relative("l3-out")).toEqual([32, 27]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 320, y: 260, properties: { fuseHealthy: false } }));
  expect(svg).toContain('aria-label="Three-pole fuse switch, fuse open"');
  expect(svg).toContain('data-state="open"');
});

it("positions and draws interface relay coil and changeover contacts", () => {
  const definition = catalogById.get("iec.interface-relay.03")!;
  const document = { id: "relay-sheet", name: "Relay", description: "", revision: 0, wires: [], components: [
    { id: "relay3", definitionId: definition.id, reference: "K3", x: 300, y: 220, rotation: 0 as const, properties: { changeoverContacts: 3, energized: true } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 300, anchor.y - 220];
  };
  expect(relative("a1")).toEqual([-47, -12]);
  expect(relative("11")).toEqual([-30, -27]);
  expect(relative("12")).toEqual([-38, 27]);
  expect(relative("14")).toEqual([-22, 27]);
  expect(relative("31")).toEqual([30, -27]);
  expect(relative("32")).toEqual([22, 27]);
  expect(relative("34")).toEqual([38, 27]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 300, y: 220, properties: { changeoverContacts: 3, energized: true } }));
  expect(svg).toContain('aria-label="Interface relay with 3 changeover contacts, energized"');
});

it("renders dedicated three-phase source and motor symbols for editable catalog devices", () => {
  expect(hasDedicatedFunctionalSymbol("supply-ac-01")).toBe(true);
  expect(hasDedicatedFunctionalSymbol("motor-01")).toBe(true);
  const source = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "supply-ac-01", x: 100, y: 100 }));
  const motor = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "motor-01", x: 100, y: 100 }));
  expect(source).toContain('aria-label="Three-phase AC supply"');
  expect(source).toContain(">3~</text>");
  expect(motor).toContain('aria-label="Siemens SIMOTICS GP 1LE1003-1CB23-4AA4, 7.5 kW, 400 V delta, 14.3 A, 4-pole induction motor"');
  expect(motor).toContain(">M</text>");
  expect(motor).toContain(">3~</text>");
});

it("renders the identified Siemens contactor with its main poles and NO/NC auxiliaries", () => {
  const breaker = catalogById.get("iec.circuit-breaker.04")!;
  const starter = catalogById.get("iec.motor-starter.01")!;
  expect(hasDedicatedFunctionalSymbol(breaker.symbolId)).toBe(true);
  expect(hasDedicatedFunctionalSymbol(starter.symbolId)).toBe(true);
  const breakerSvg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: breaker.symbolId, x: 100, y: 100, properties: breaker.propertiesSchema }));
  const starterSvg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: starter.symbolId, x: 100, y: 100, properties: starter.propertiesSchema }));
  expect(breakerSvg).toContain('aria-label="4-pole circuit breaker, open"');
  expect(breakerSvg.match(/<path /g)).toHaveLength(4);
  expect(starterSvg).toContain("three main poles, one NO auxiliary and one NC auxiliary");
  expect(starterSvg).toContain('data-state="idle"');
});

it("draws and exposes the four terminals of the sourced 24 V control power supply", () => {
  const definition = catalogById.get("iec.dc-control-supply.01")!;
  const document = createSourcedDolMotorStarter();
  const anchors = terminalAnchors(document).filter((item) => item.endpoint.componentId === "control-psu");
  expect(anchors.map((item) => item.endpoint.terminalId)).toEqual(["line-in", "neutral-in", "plus-out", "zero-out"]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 500, y: 300, properties: definition.propertiesSchema }));
  expect(svg).toContain('aria-label="Siemens SITOP PSU100C 24 V DC power supply"');
});

it("renders the sourced Siemens DOL motor with all four connectable power terminals", () => {
  const definition = catalogById.get("iec.induction-motor.01")!;
  const document = { id: "motor-sheet", name: "Motor", description: "", revision: 0, wires: [], components: [
    { id: "m1", definitionId: definition.id, reference: "M1", x: 420, y: 300, rotation: 0 as const, properties: definition.propertiesSchema },
  ] };
  const anchors = terminalAnchors(document);
  expect(anchors.filter((item) => item.endpoint.componentId === "m1").map((item) => item.endpoint.terminalId)).toEqual(["u1", "v1", "w1", "pe"]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 420, y: 300, properties: definition.propertiesSchema }));
  expect(svg).toContain("Siemens SIMOTICS GP 1LE1003-1CB23-4AA4");
  expect(svg).toContain("400 V delta");
});

