import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogById, componentLibraryCatalog } from "../src/catalog/dolCatalog";
import { Schematic } from "../src/components/Schematic";
import { terminalAnchors, terminalGridReference } from "../src/cad/terminalAnchors";
import { componentsInStackOrder, reorderComponents } from "../src/cad/componentStack";
import { transformComponent } from "../src/cad/documentOps";
import { transformFromHandle } from "../src/components/ComponentTransformHandles";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import type { ProjectContinuation } from "../src/types/electrical";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";
import { createStarDeltaCircuit } from "../src/projects/starDeltaCircuit";
import { createReversingCircuit } from "../src/projects/reversingCircuit";
import { initialDolState } from "../src/simulation/dolSimulator";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createSourcedDolMotorStarter } from "../src/projects/sourcedDolMotorStarter";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("uses the validated component commands for handle transforms and keeps wire endpoints attached", () => {
  const document = createAnalogLevelProject().document;
  const component = document.components.find((item) => item.id === "adc")!;
  const resize = transformFromHandle("resize", component, { x: component.x + 55, y: component.y + 40 }, { x: component.x + 66, y: component.y + 48 });
  expect(resize).toEqual({ kind: "resize", size: 1.2 });
  const scaled = transformComponent(document, component.id, resize);
  expect(scaled.ok).toBe(true);
  const rotate = transformFromHandle("rotate", component, { x: component.x, y: component.y - 60 }, { x: component.x + 60, y: component.y });
  expect(rotate).toEqual({ kind: "rotate", rotation: 90 });
  const rotated = transformComponent(scaled.document, component.id, rotate);
  expect(rotated.ok).toBe(true);
  expect(rotated.document.wires).toBe(document.wires);
  const locate = (input: typeof document) => terminalAnchors(input).find((anchor) => anchor.endpoint.componentId === component.id && anchor.endpoint.terminalId === "in");
  expect(locate(rotated.document)).not.toEqual(locate(document));
  expect(transformComponent(rotated.document, component.id, rotate).document).toBe(rotated.document);
  const nearEdge = { ...document, components: document.components.map((item) => item.id === component.id ? { ...item, y: 705 } : item) };
  expect(transformComponent(nearEdge, component.id, rotate)).toMatchObject({ ok: false, document: nearEdge });

  const props = {
    document: rotated.document, selectedComponentId: component.id, selectedWireId: "",
    simulation: initialDolState(), wireMode: false, wireStart: null, onSelect: () => {},
    onWireSelect: () => {}, onTerminalSelect: () => {}, onComponentTransform: () => {},
  };
  expect(renderToStaticMarkup(createElement(Schematic, props))).toContain('aria-label="Resize ADC1"');
  expect(renderToStaticMarkup(createElement(Schematic, props))).toContain('aria-label="Rotate ADC1"');
  expect(renderToStaticMarkup(createElement(Schematic, { ...props, wireMode: true }))).not.toContain('aria-label="Resize ADC1"');
  expect(renderToStaticMarkup(createElement(Schematic, { ...props, selectedComponentIds: ["adc", "plc"] }))).not.toContain('aria-label="Rotate ADC1"');
});

it("persists component stacking and renders symbols and terminal hit targets in paint order", () => {
  const document = createAnalogLevelProject().document;
  const originalIds = document.components.map((component) => component.id);
  expect(componentsInStackOrder(document.components).map((component) => component.id)).toEqual(originalIds);
  const components = reorderComponents(document.components, ["level", "adc"], "front");
  expect(components.map((component) => component.id)).toEqual(originalIds);
  expect(reorderComponents(components, ["level", "adc"], "front")).toBe(components);
  const project = createStarterProject();
  const sheet = { id: "stack", name: "Stack", kind: "free-schematic" as const, document: { ...document, components } };
  const [restored] = parseProjectJson(JSON.stringify({ ...project, sheets: [sheet] })).sheets;
  expect(componentsInStackOrder(restored.document.components).map((component) => component.id)).toEqual(["plc", "coil", "level", "adc"]);
  expect(restored.document.wires.map(({ from, to }) => ({ from, to }))).toEqual(document.wires.map(({ from, to }) => ({ from, to })));
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document: restored.document,
    selectedComponentId: "",
    selectedWireId: "",
    simulation: initialDolState(),
    wireMode: true,
    wireStart: null,
    onSelect: () => {},
    onWireSelect: () => {},
    onTerminalSelect: () => {},
  }));
  expect(markup).toMatch(/class="free-reference"[^>]*>PLC1<.*class="free-reference"[^>]*>ADC1</);
  expect(markup).toMatch(/Wire terminal plc\.ai-0.*Wire terminal adc\.in/);
});

it("places every selectable catalog terminal at a distinct wireable canvas point", () => {
  for (const definition of componentLibraryCatalog) {
    const document = {
      id: "catalog-terminal-audit", name: definition.name, description: "", revision: 1, wires: [],
      components: [{ id: "device", definitionId: definition.id, reference: `${definition.referencePrefix}1`, x: 550, y: 390, rotation: 0 as const, properties: { ...definition.propertiesSchema } }],
    };
    const anchors = terminalAnchors(document);
    expect(anchors.map((item) => item.endpoint.terminalId), definition.name).toEqual(definition.terminals.map((terminal) => terminal.id));
    expect(new Set(anchors.map((item) => `${item.x},${item.y}`)).size, `${definition.name} has overlapping wire points`).toBe(definition.terminals.length);
  }
});

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
  for (const anchor of anchors) {
    expect(symbol).toContain(`d="M ${anchor.x} ${anchor.y} H ${anchor.x < component.x ? 276 : 324}"`);
  }
});

it("keeps connection pins visible on the sheet and larger in wire mode", () => {
  const document = createReversingCircuit();
  const render = (wireMode: boolean) => renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(render(false)).toContain('r="7" class="terminal-pin"');
  expect(render(true)).toContain('r="7" class="terminal-anchor"');

  const freeDocument = addFreeSchematicSheet(createStarterProject()).sheets[1].document;
  const motorDefinition = catalogById.get("iec.induction-motor.41")!;
  freeDocument.components.push({ id: "free-motor", definitionId: motorDefinition.id, reference: "M1", x: 500, y: 340, rotation: 0, properties: { ...motorDefinition.propertiesSchema } });
  const renderFree = (wireMode: boolean) => renderToStaticMarkup(createElement(Schematic, {
    document: freeDocument, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(renderFree(false)).toContain('class="terminal-pin"');
  expect(renderFree(false)).not.toContain('class="terminal-anchor"');
  expect(renderFree(true)).toContain('r="7" class="terminal-anchor"');
  expect(renderFree(false).match(/class="terminal-pin"/g)).toHaveLength(motorDefinition.terminals.length);
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

it("renders the generic dual-channel relay with separate signal anchors", () => {
  const definition = catalogById.get("safety.dual-relay")!;
  const component = { id: "SR1", definitionId: definition.id, reference: "SR1", x: 300, y: 300, rotation: 0 as const, properties: definition.propertiesSchema };
  const document = { id: "signal-monitor", name: "Signal monitor", description: "", revision: 1, components: [component], wires: [] };
  const positions = Object.fromEntries(terminalAnchors(document).map(({ endpoint, x, y }) => [endpoint.terminalId, [x, y]]));
  expect(positions).toEqual({ "in-a": [253, 272], "in-b": [253, 290], reset: [253, 308], out: [347, 290], common: [300, 325] });
  const symbol = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 300, y: 300 }));
  expect(symbol).toContain("Generic dual-channel monitoring relay");
  expect(symbol).not.toContain("PNOZ");
});

it("renders anchors for every free-sheet wire even when component IDs match the reference sheet", () => {
  for (const document of [createStarDeltaCircuit(), createReversingCircuit()]) {
    const endpoints = new Set(terminalAnchors(document).map((anchor) => `${anchor.endpoint.componentId}.${anchor.endpoint.terminalId}`));
    for (const wire of document.wires) for (const endpoint of [wire.from, wire.to]) expect(endpoints.has(`${endpoint.componentId}.${endpoint.terminalId}`)).toBe(true);
  }
});

it("places all six motor winding terminals outside the IEC motor symbol body", () => {
  const document = createStarDeltaCircuit();
  const motor = document.components.find((component) => catalogById.get(component.definitionId)?.simulationModelId === "six-terminal-windings")!;
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



it("renders the source-backed Siemens starter as three power poles, a coil and two auxiliary contacts", () => {
  expect(hasDedicatedFunctionalSymbol("starter-01")).toBe(true);
  const open = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "starter-01", x: 100, y: 100, properties: { energized: false } }));
  const closed = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "starter-01", x: 100, y: 100, properties: { energized: true } }));
  expect(open).toContain("Siemens SIRIUS 3RT2025-1BB40 contactor, three main poles, one NO auxiliary and one NC auxiliary, de-energized");
  expect(open).toContain('data-state="de-energized"');
  expect(closed).toContain('data-state="energized"');
  expect(closed).toContain("M 76 73 V 88 L 76 108");
  expect(closed).toContain("M 76 108 V 127");
  expect(open).toContain("M 76 73 V 88 L 85 102");
  expect(open).not.toContain("<rect");
  expect(open.match(/<path/g)?.length).toBeGreaterThanOrEqual(5);
  expect(open).not.toEqual(closed);

  const document = createSourcedDolMotorStarter();
  const anchors = terminalAnchors(document).filter((item) => item.endpoint.componentId === "contactor");
  expect(anchors).toHaveLength(12);
  expect(anchors.find((item) => item.endpoint.terminalId === "l1-in")).toMatchObject({ x: 366, y: 313 });
  expect(anchors.find((item) => item.endpoint.terminalId === "a1")).toMatchObject({ x: 374, y: 293 });
  expect(anchors.find((item) => item.endpoint.terminalId === "aux-13")).toMatchObject({ x: 343, y: 328 });
  expect(anchors.find((item) => item.endpoint.terminalId === "aux-22")).toMatchObject({ x: 437, y: 352 });
});

it("keeps the three-phase source mark inside its symbol and every DOL wire on a real terminal", () => {
  const sourceSvg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: "supply-ac-01", x: 100, y: 100 }));
  expect(sourceSvg).toContain('aria-label="Three-phase AC supply"');
  expect(sourceSvg).toContain('M 68 127 V 112');
  expect(sourceSvg).toContain('M 147 100 H 138');

  const document = createSourcedDolMotorStarter();
  const anchors = terminalAnchors(document);
  const endpoints = new Set(anchors.map((item) => `${item.endpoint.componentId}.${item.endpoint.terminalId}`));
  for (const wire of document.wires) for (const endpoint of [wire.from, wire.to]) {
    expect(endpoints.has(`${endpoint.componentId}.${endpoint.terminalId}`)).toBe(true);
  }
  for (const [terminalId, expected] of [["l1-out", [358, 127]], ["l2-out", [390, 127]], ["l3-out", [422, 127]]] as const) {
    const pin = anchors.find((item) => item.endpoint.componentId === "supply" && item.endpoint.terminalId === terminalId)!;
    expect([pin.x, pin.y]).toEqual(expected);
  }
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
    { sheetId: source.id, gridReference: "1.1", role: "source", endpoint: { componentId: supply.id, terminalId: "l1-out" } },
    { sheetId: middle.id, gridReference: "2.1", role: "continuation", endpoint: { componentId: middleSupply.id, terminalId: "l1-out" } },
    { sheetId: destination.id, gridReference: "3.1", role: "destination", endpoint: { componentId: destinationSupply.id, terminalId: "l1-out" } },
  ] };
  const render = (sheetId: string) => {
    const sheet = project.sheets.find((item) => item.id === sheetId)!;
    return renderToStaticMarkup(createElement(Schematic, { document: sheet.document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null, continuations: [continuation], projectSheets: project.sheets, activeSheetId: sheet.id, selectedContinuationId: continuation.id, onContinuationNavigate: () => {}, onContinuationSelect: () => {}, onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {} }));
  };
  expect(render(source.id)).toContain("L1 → S2 · 2.1");
  expect(render(source.id)).toContain("project-continuation-marker selected");
  expect(render(middle.id)).toContain("L1 ← S1 · 1.1 → S3 · 3.1");
  expect(render(destination.id)).toContain("L1 ← S2 · 2.1 (src S1 · 1.1)");
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
    { id: "km4", definitionId: "iec.motor-starter.01", reference: "KM1", x: 650, y: 420, rotation: 0 as const, properties: { auxiliaryNoContacts: 1, auxiliaryNcContacts: 1 } },
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
  expect(relative("km4", "l1-in")).toEqual([-24, -27]);
  expect(relative("km4", "l2-in")).toEqual([0, -27]);
  expect(relative("km4", "l3-in")).toEqual([24, -27]);
  expect(relative("km4", "l1-out")).toEqual([-24, 27]);
  expect(relative("km4", "l2-out")).toEqual([0, 27]);
  expect(relative("km4", "l3-out")).toEqual([24, 27]);
  expect(relative("km4", "a1")).toEqual([-16, -47]);
  expect(relative("km4", "a2")).toEqual([16, -47]);
  expect(relative("km4", "aux-13")).toEqual([-47, -12]);
  expect(relative("km4", "aux-14")).toEqual([-47, 12]);
  expect(relative("km4", "aux-21")).toEqual([47, -12]);
  expect(relative("km4", "aux-22")).toEqual([47, 12]);
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
  for (const anchor of anchors) {
    expect(svg).toContain(`d="M ${anchor.x} ${anchor.y} H `);
  }
  expect(svg).toContain('M 467 300 H 442');
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
  for (const anchor of anchors) {
    expect(svg).toContain(`d="M ${anchor.x} ${anchor.y} H 316"`);
  }
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
  expect(svg).toContain('M 373 288 H 382 M 373 312 H 382');
  expect(svg).toContain('M 420 327 V 305 H 428 M 467 288 H 444 M 467 312 H 444');
  expect(svg).toContain('M 428 305 L 444 312');
  const timingSvg = renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: definition.symbolId, x: 420, y: 300,
    properties: { energized: true, elapsedSeconds: 1, delaySeconds: 2 },
  }));
  expect(timingSvg).toContain('data-state="timing"');
  expect(timingSvg).toContain('M 428 305 L 444 288');
});

it("draws all VFD line, motor, and earth leads at their wiring anchors", () => {
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
  for (const anchor of anchors) {
    const leadEnd = anchor.endpoint.terminalId === "pe" ? "V 342" : `H ${anchor.x < 450 ? 420 : 480}`;
    expect(svg).toContain(`d="M ${anchor.x} ${anchor.y} ${leadEnd}"`);
  }
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
  expect(svg).toContain(">AI</text>");
  for (const { x, y } of anchors) expect(svg).toContain(`M ${x} ${y} H ${x < 500 ? 475 : 525}`);
});

it.each(["signal.adc", "signal.dac"])("connects every %s symbol lead to its anchor", (definitionId) => {
  const definition = catalogById.get(definitionId)!;
  const document = { id: "converter-sheet", name: "Converter", description: "", revision: 0, wires: [], components: [
    { id: "converter", definitionId, reference: "U1", x: 500, y: 340, rotation: 0 as const, properties: {} },
  ] };
  const svg = renderToStaticMarkup(createElement(FunctionalSymbol, { symbolId: definition.symbolId, x: 500, y: 340 }));
  const anchors = terminalAnchors(document);
  expect(anchors).toHaveLength(3);
  for (const { x, y } of anchors) expect(svg).toContain(`M ${x} ${y} H ${x < 500 ? 476 : 524}`);
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
  for (const anchor of anchors) {
    expect(svg).toContain(`M ${anchor.x} ${anchor.y} `);
  }
  expect(svg).toContain('M 270 218 L 273 237');
  const idleSvg = renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: definition.symbolId, x: 300, y: 220, properties: { changeoverContacts: 3, energized: false },
  }));
  expect(idleSvg).toContain('M 270 218 L 267 237');
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
  expect(starterSvg).toContain('data-state="de-energized"');
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

it("renders the Siemens star/delta motor with seven real winding and earth terminals", () => {
  const document = createStarDeltaCircuit();
  const motor = document.components.find((item) => item.id === "motor")!;
  const terminalIds = terminalAnchors(document).filter((item) => item.endpoint.componentId === motor.id).map((item) => item.endpoint.terminalId);
  expect(terminalIds).toEqual(["u1", "v1", "w1", "u2", "v2", "w2", "pe"]);
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: motor.id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain('aria-label="Siemens SIMOTICS GP · 6 terminal, six winding terminals U1 V1 W1 U2 V2 W2 and PE"');
  expect(markup).toContain("motor.u2");
  expect(markup).toContain("motor.w2");
});




it("converts the exact canvas terminal anchor into its project grid reference", () => {
  const document = createStarDeltaCircuit();
  const toReference = (x: number, y: number) => {
    let index = Math.max(0, Math.round(x / 20));
    let column = "";
    while (index >= 0) {
      column = String.fromCharCode(65 + index % 26) + column;
      index = Math.floor(index / 26) - 1;
    }
    return `${column}${Math.floor(y / 20) + 1}`;
  };
  for (const anchor of terminalAnchors(document)) {
    expect(terminalGridReference(document, anchor.endpoint)).toBe(toReference(anchor.x, anchor.y));
  }
  expect(terminalGridReference(document, { componentId: "missing", terminalId: "missing" })).toBe("A1");
});
