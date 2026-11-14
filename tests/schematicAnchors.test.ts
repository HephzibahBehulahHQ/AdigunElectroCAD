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
  expect(definition.symbolId).toMatch(/^sensor-\\d+$/);
  expect(relative("supply")).toEqual([-47, -14]);
  expect(relative("signal")).toEqual([47, 0]);
  expect(relative("common")).toEqual([-47, 14]);
  const symbol = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: component.x, y: component.y }));
  expect(symbol).toContain("Inductive proximity sensor with +24V, SIG and 0V terminals");
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



it("renders three connected zigzag heater poles and shows the tripped interruption", () => {
  const document = createDolMotorStarter();
  expect(terminalAnchors(document).find((item) => item.endpoint.componentId === "overload" && item.endpoint.terminalId === "t1")).toMatchObject({ x: 165, y: 449 });
  const render = (overloadTripped: boolean) => renderToStaticMarkup(createElement(Schematic, {
    document,
    selectedComponentId: "",
    selectedWireId: "",
    simulation: { ...initialDolState(), overloadTripped },
    wireMode: false,
    wireStart: null,
    onSelect: () => undefined,
    onWireSelect: () => undefined,
    onTerminalSelect: () => undefined,
  }));
  const healthy = render(false);
  for (const label of ["1", "3", "5", "2", "4", "6", "1/L1", "3/L2", "5/L3", "2/T1", "4/T2", "6/T3"]) expect(healthy).toContain(`>${label}</text>`);
  const tripped = render(true);
  expect(healthy.match(/class="terminal-label overload-terminal-label"/g)).toHaveLength(6);
  for (const label of ["1", "3", "5", "2", "4", "6"]) expect(healthy).toContain(`class="terminal-label overload-terminal-label">${label}</text>`);
  expect(healthy.match(/class="overload"/g)).toHaveLength(3);
  expect(healthy).toContain("Three-phase thermal overload heater poles, healthy");
  expect(healthy).toContain("l -6 4 l 12 6");
  expect(healthy).toContain("contact-blade closed");
  expect(tripped).toContain('data-state="tripped"');
  expect(tripped.match(/class="wire fault overload-output"/g)).toHaveLength(3);
  for (const x of [165, 255, 345]) expect(tripped).toContain(`d="M ${x} 415 L ${x + 9} 437"`);
});

it("renders STOP and START terminal IDs at their connected reference anchors", () => {
  const document = createDolMotorStarter();
  const anchors = terminalAnchors(document);
  for (const [componentId, terminalId, x] of [["stop", "21", 170], ["stop", "22", 280], ["start", "13", 440], ["start", "14", 548]] as const) {
    expect(anchors.find((item) => item.endpoint.componentId === componentId && item.endpoint.terminalId === terminalId)).toMatchObject({ x, y: 730 });
  }
  const svg = renderToStaticMarkup(createElement(Schematic, { document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null, onSelect: () => undefined, onWireSelect: () => undefined, onTerminalSelect: () => undefined }));
  for (const [terminal, value] of [["stop.21", "21"], ["stop.22", "22"], ["start.13", "13"], ["start.14", "14"]]) expect(svg).toContain(`data-terminal="${terminal}">${value}</text>`);
});

it("renders source, intermediate, and destination continuation references with sheet/grid traceability", () => {
  const project = addFreeSchematicSheet(addFreeSchematicSheet(createStarterProject()));
  const [source, middle, destination] = project.sheets;
  const supply = source.document.components[0];
  if (!supply) throw new Error("Fixture requires a catalog source component");
  const middleSupply = { ...supply, id: "continuation-middle-source", reference: "X2", x: 400, y: 300 };
  const destinationSupply = { ...supply, id: "continuation-destination-source", reference: "X3", x: 400, y: 300 };
  middle.document.components.push(middleSupply);
  destination.document.components.push(destinationSupply);
  const continuation: ProjectContinuation = { id: "net-l1-main", label: "L1", conductorColor: "#c42626", points: [
    { sheetId: source.id, gridReference: "1.1", role: "source", endpoint: { componentId: supply.id, terminalId: "l1" } },
    { sheetId: middle.id, gridReference: "2.1", role: "continuation", endpoint: { componentId: middleSupply.id, terminalId: "l1" } },
    { sheetId: destination.id, gridReference: "3.1", role: "destination", endpoint: { componentId: destinationSupply.id, terminalId: "l1" } },
  ] };
  const render = (sheetId: string) => {
    const sheet = project.sheets.find((item) => item.id === sheetId)!;
    return renderToStaticMarkup(createElement(Schematic, { document: sheet.document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null, continuations: [continuation], projectSheets: project.sheets, activeSheetId: sheet.id, selectedContinuationId: continuation.id, onContinuationNavigate: () => {}, onContinuationSelect: () => {}, onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {} }));
  };
  expect(render(source.id)).toContain("L1 → S2 · 2.1");
  expect(render(source.id)).toContain("project-continuation-marker selected");
  expect(render(middle.id)).toContain("L1 ↔ S1 · 1.1 / S3 · 3.1");
  expect(render(destination.id)).toContain("L1 ← S1 · 1.1");
});

it("shows real pins and labels on free-sheet three-phase source and motor symbols", () => {
  const document = addFreeSchematicSheet(createStarterProject()).sheets[1].document;
  document.components.push(
    { id: "incoming", definitionId: "supply.three-phase", reference: "X1", x: 250, y: 180, rotation: 0, properties: {} },
    { id: "mtr1", definitionId: "motor.three-phase", reference: "M1", x: 620, y: 430, rotation: 0, properties: {} },
  );
  const anchors = terminalAnchors(document);
  const relative = (componentId: string, terminalId: string) => {
    const item = anchors.find((anchor) => anchor.endpoint.componentId === componentId && anchor.endpoint.terminalId === terminalId)!;
    const component = document.components.find((entry) => entry.id === componentId)!;
    return [item.x - component.x, item.y - component.y];
  };
  expect(relative("incoming", "l1")).toEqual([-24, -35]);
  expect(relative("incoming", "l2")).toEqual([0, -35]);
  expect(relative("incoming", "l3")).toEqual([24, -35]);
  expect(relative("incoming", "pe")).toEqual([47, 0]);
  expect(relative("mtr1", "u1")).toEqual([-24, -35]);
  expect(relative("mtr1", "v1")).toEqual([0, -35]);
  expect(relative("mtr1", "w1")).toEqual([24, -35]);
  expect(relative("mtr1", "pe")).toEqual([47, 0]);
  const svg = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => undefined, onWireSelect: () => undefined, onTerminalSelect: () => undefined,
  }));
  expect(svg).toContain('class="terminal-pin"');
  expect(svg).toContain('class="free-terminal-label">L1</text>');
  expect(svg).toContain('class="free-terminal-label">U1</text>');
  expect(svg).toContain(">M</text>");
  expect(svg).toContain(">3~</text>");
});

it("positions four-pole breaker neutral and catalog motor-starter auxiliary terminals", () => {
  const document = { id: "free", name: "Free", description: "", revision: 0, wires: [], components: [
    { id: "q4", definitionId: "iec.circuit-breaker.04", reference: "Q4", x: 300, y: 220, rotation: 0 as const, properties: { poles: 4 } },
    { id: "km4", definitionId: "iec.motor-starter.04", reference: "KM4", x: 650, y: 420, rotation: 0 as const, properties: { auxiliaryNoContacts: 4 } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (componentId: string, terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.componentId === componentId && item.endpoint.terminalId === terminalId)!;
    const component = document.components.find((item) => item.id === componentId)!;
    return [anchor.x - component.x, anchor.y - component.y];
  };
  expect(relative("q4", "l1-in")).toEqual([-36, -27]);
  expect(relative("q4", "l3-out")).toEqual([12, 27]);
  expect(relative("q4", "n-in")).toEqual([36, -27]);
  expect(relative("q4", "n-out")).toEqual([36, 27]);
  expect(relative("km4", "aux-13")).toEqual([47, -30]);
  expect(relative("km4", "aux-14")).toEqual([47, -22]);
  expect(relative("km4", "aux-43")).toEqual([47, 18]);
  expect(relative("km4", "aux-44")).toEqual([47, 26]);
});

it("draws a scaled panel meter with separate supply, measurement, and common pins", () => {
  const definition = catalogById.get("iec.panel-meter.01")!;
  const document = { id: "meter-sheet", name: "Meter", description: "", revision: 0, wires: [], components: [
    { id: "p1", definitionId: definition.id, reference: "P1", x: 420, y: 300, rotation: 0 as const, properties: { measurementKind: "Voltage", measuredValue: 48, scaleMaximum: 100 } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 420, anchor.y - 300];
  };
  expect(relative("supply")).toEqual([-47, -14]);
  expect(relative("common")).toEqual([-47, 14]);
  expect(relative("signal")).toEqual([47, 0]);
  expect(definition.terminals.find((terminal) => terminal.id === "signal")?.direction).toBe("input");
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 420, y: 300, properties: { measurementKind: "Voltage", measuredValue: 48, scaleMaximum: 100 } }));
  expect(svg).toContain('aria-label="Digital panel meter, Voltage, 48.0 V"');
});

it("draws the solenoid actuator and positions its coil terminals", () => {
  const definition = catalogById.get("iec.solenoid-actuator.01")!;
  const document = { id: "actuator-sheet", name: "Actuator", description: "", revision: 0, wires: [], components: [
    { id: "y1", definitionId: definition.id, reference: "Y1", x: 340, y: 250, rotation: 0 as const, properties: { energized: true, returnSpring: true } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 340, anchor.y - 250];
  };
  expect(relative("a1")).toEqual([-47, -12]);
  expect(relative("a2")).toEqual([-47, 12]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 340, y: 250, properties: { energized: true, returnSpring: true } }));
  expect(svg).toContain('aria-label="Solenoid actuator, energized"');
  expect(svg).toContain('data-state="energized"');
});

it("draws a feed-through terminal block and positions both wire terminals", () => {
  const definition = catalogById.get("iec.feed-through-terminal.01")!;
  const document = { id: "terminal-sheet", name: "Terminal", description: "", revision: 0, wires: [], components: [
    { id: "x1", definitionId: definition.id, reference: "X1", x: 360, y: 280, rotation: 0 as const, properties: { continuityClosed: false } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 360, anchor.y - 280];
  };
  expect(relative("1")).toEqual([-47, 0]);
  expect(relative("2")).toEqual([47, 0]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 360, y: 280, properties: { continuityClosed: false } }));
  expect(svg).toContain('aria-label="Feed-through terminal block, open"');
  expect(svg).toContain('data-state="open"');
});

it("places and draws selector switch NO/NC contacts", () => {
  const definition = catalogById.get("iec.selector-switch.02")!;
  const document = { id: "selector-sheet", name: "Selector", description: "", revision: 0, wires: [], components: [
    { id: "s2", definitionId: definition.id, reference: "S2", x: 380, y: 260, rotation: 0 as const, properties: { contactForm: "NC", closed: true, positions: 3 } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 380, anchor.y - 260];
  };
  expect(relative("21")).toEqual([-47, 0]);
  expect(relative("22")).toEqual([47, 0]);
  expect(hasDedicatedFunctionalSymbol(definition.symbolId)).toBe(true);
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 380, y: 260, properties: { contactForm: "NC", closed: true, positions: 3 } }));
  expect(svg).toContain('aria-label="Maintained selector switch, normally closed, 3 positions, closed"');
});

it("draws and anchors the on-delay relay coil and 15/16/18 changeover contact", () => {
  const definition = catalogById.get("iec.on-delay-timer.01")!;
  const document = { id: "timer-sheet", name: "Timer", description: "", revision: 0, wires: [], components: [
    { id: "kt1", definitionId: definition.id, reference: "KT1", x: 420, y: 300, rotation: 0 as const, properties: { energized: true, elapsedSeconds: 2, delaySeconds: 2 } },
  ] };
  const anchors = terminalAnchors(document);
  const relative = (terminalId: string) => {
    const anchor = anchors.find((item) => item.endpoint.terminalId === terminalId)!;
    return [anchor.x - 420, anchor.y - 300];
  };
  expect(relative("a1")).toEqual([-47, -12]);
  expect(relative("a2")).toEqual([-47, 12]);
  expect(relative("15")).toEqual([0, 27]);
  expect(relative("16")).toEqual([47, -12]);
  expect(relative("18")).toEqual([47, 12]);
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
  expect(motor).toContain('aria-label="Three-phase induction motor"');
  expect(motor).toContain(">M</text>");
  expect(motor).toContain(">3~</text>");
});

it("uses dedicated symbols for modeled four-pole breakers and multi-aux starters", () => {
  const breaker = catalogById.get("iec.circuit-breaker.04")!;
  const starter = catalogById.get("iec.motor-starter.04")!;
  expect(hasDedicatedFunctionalSymbol(breaker.symbolId)).toBe(true);
  expect(hasDedicatedFunctionalSymbol(starter.symbolId)).toBe(true);
  const breakerSvg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: breaker.symbolId, x: 100, y: 100, properties: breaker.propertiesSchema }));
  const starterSvg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: starter.symbolId, x: 100, y: 100, properties: starter.propertiesSchema }));
  expect(breakerSvg).toContain('aria-label="4-pole circuit breaker, open"');
  expect(breakerSvg.match(/<path /g)).toHaveLength(4);
  expect(starterSvg).toContain('aria-label="Motor starter with three main poles and 4 auxiliary NO contacts"');
});
