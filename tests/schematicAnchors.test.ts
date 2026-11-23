import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogById, componentLibraryCatalog } from "../src/catalog/dolCatalog";
import { Schematic } from "../src/components/Schematic";
import { terminalAnchors, terminalGridReference, terminalHitRadius } from "../src/cad/terminalAnchors";
import { componentFootprint, instanceFootprint } from "../src/cad/componentGeometry";
import { componentsInStackOrder, reorderComponents } from "../src/cad/componentStack";
import { moveComponent, transformComponent } from "../src/cad/documentOps";
import { orthogonalWirePath } from "../src/cad/wirePath";
import { transformFromHandle } from "../src/components/ComponentTransformHandles";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
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
  expect(transformComponent(nearEdge, component.id, rotate).ok).toBe(true);
  const framed = { ...nearEdge, id: "reference-dol-motor-starter" };
  expect(transformComponent(framed, component.id, rotate)).toMatchObject({ ok: false, document: framed });

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
  expect(markup).toMatch(/data-wire-terminal="plc\.ai-0".*aria-label="Wire terminal PLC1 [^"]+".*data-wire-terminal="adc\.in".*aria-label="Wire terminal ADC1 [^"]+"/);
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
  expect(render(false)).toContain('r="3" class="terminal-pin"');
  expect(render(true)).toContain('r="4" pointer-events="none" vector-effect="non-scaling-stroke" class="terminal-anchor"');

  const freeDocument = addFreeSchematicSheet(createStarterProject()).sheets[1].document;
  const motorDefinition = catalogById.get("iec.induction-motor.41")!;
  freeDocument.components.push({ id: "free-motor", definitionId: motorDefinition.id, reference: "M1", x: 500, y: 340, rotation: 0, properties: { ...motorDefinition.propertiesSchema } });
  const renderFree = (wireMode: boolean) => renderToStaticMarkup(createElement(Schematic, {
    document: freeDocument, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(renderFree(false)).toContain('class="terminal-pin"');
  expect(renderFree(false)).not.toContain('data-wiring="true"');
  expect(renderFree(true)).toContain('data-wiring="true"');
  expect(renderFree(true)).toContain('r="4" pointer-events="none" vector-effect="non-scaling-stroke" class="terminal-anchor"');
  expect(renderFree(true).match(/class="terminal-pin"/g)).toHaveLength(motorDefinition.terminals.length);
  expect(renderFree(false).match(/class="terminal-pin"/g)).toHaveLength(motorDefinition.terminals.length);
});

it.each([
  { sheet: "free sheet", document: createReversingCircuit() },
  { sheet: "DOL reference", document: createDolMotorStarter() },
])("exposes keyboard wiring controls in Select mode on the $sheet", ({ document }) => {
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toMatch(/<svg [^>]*role="group"[^>]*aria-description="Focus a terminal/);
  expect(markup).toMatch(/data-wire-terminal="[^"]+" role="button" tabindex="0"/);
});

it("gives terminal hit targets priority and disables branch targets during a terminal wire draft", () => {
  const document = createReversingCircuit();
  const render = (wireStart: typeof document.wires[number]["from"] | null) => renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: true, wireStart,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {}, onWireBranchStart: () => {},
  }));
  expect(render(null)).toContain("wire-branch-hit-target");
  const source = document.wires[0].from;
  const component = document.components.find(({ id }) => id === source.componentId)!;
  component.terminalLabels = { ...component.terminalLabels, [source.terminalId]: "TEST PIN" };
  const draft = render(source);
  expect(draft).toContain('aria-label="Wire terminal ' + component.reference + ' TEST PIN" aria-pressed="true"');
  expect(draft).not.toContain("wire-branch-hit-target");
  expect(draft.indexOf('class="terminal-anchors"')).toBeGreaterThan(draft.indexOf('class="project-continuation-markers"'));
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
  for (const anchor of anchors) expect(symbol).toContain(`M ${anchor.x} ${anchor.y} `);
  const right = anchors.filter(anchor => anchor.x === component.x + 74);
  expect(terminalHitRadius(right[0], anchors, .25)).toBeLessThan(6);
  expect(terminalHitRadius(right[0], anchors, 2)).toBe(4.5);
  for (const rotation of [0, 90, 180, 270] as const) {
    const scaled = { ...component, rotation, size: 1.5 };
    const bounds = componentFootprint(scaled.x, scaled.y, rotation, definition.id, scaled.size);
    for (const pin of terminalAnchors({ ...document, components: [scaled] })) {
      expect(pin.x).toBeGreaterThan(bounds.left);
      expect(pin.x).toBeLessThan(bounds.right);
      expect(pin.y).toBeGreaterThan(bounds.top);
      expect(pin.y).toBeLessThan(bounds.bottom);
    }
  }
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

it("lays out all 36 feeder source markers without overlapping adjacent terminal stacks", () => {
  const project = createMotorFeederWorkbook();
  const [sheet] = project.sheets;
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document: sheet.document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    continuations: project.continuations, projectSheets: project.sheets, activeSheetId: sheet.id,
    onSelect: () => undefined, onWireSelect: () => undefined, onTerminalSelect: () => undefined,
  }));
  const boxes = [...markup.matchAll(/class="project-continuation-marker" transform="translate\(([-.\d]+) ([-.\d]+)\)"[^>]*><rect x="-3" y="-15" width="([.\d]+)" height="18"/g)]
    .map(([, x, y, width]) => ({ left: +x - 3, top: +y - 15, right: +x - 3 + +width, bottom: +y + 3 }));
  expect(boxes).toHaveLength(36);
  const components = sheet.document.components.map(instanceFootprint);
  for (const [index, box] of boxes.entries()) {
    const obstacles = [...components, ...boxes.slice(index + 1)];
    expect(obstacles.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)).toBe(false);
  }
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

it("draws damper blade travel from measured position rather than command", () => {
  const render = (position: number) => renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: "hvac-damper", x: 100, y: 100,
    properties: { positionPercent: 0, commandPercent: 100, runtimeDamperPositionPercent: position },
  }));
  expect(render(0)).toContain('d="M 80 95 L 120 79"');
  expect(render(60)).toContain('Damper position 60.0%');
  expect(render(100)).toContain('d="M 80 87 L 120 87"');
  expect(render(NaN)).toContain('Damper position unavailable');
});

it.each([
  { route: "automatic", points: [] },
  { route: "custom", points: [{ x: 400, y: 450 }, { x: 600, y: 450 }] },
])("keeps a $route wire attached after moving both ends", ({ points }) => {
  const drawing = createReversingCircuit();
  const existing = drawing.wires.find(({ from, to }) => from.componentId !== to.componentId)!;
  const wire = { ...existing, points };
  const document = { ...drawing, wires: [wire] };
  const movedFrom = moveComponent(document, wire.from.componentId, 15, 27);
  const movedBoth = moveComponent(movedFrom, wire.to.componentId, -22, 35);
  const path = (sheet: typeof document) => {
    const pins = terminalAnchors(sheet);
    const from = pins.find(({ endpoint }) => endpoint.componentId === wire.from.componentId && endpoint.terminalId === wire.from.terminalId)!;
    const to = pins.find(({ endpoint }) => endpoint.componentId === wire.to.componentId && endpoint.terminalId === wire.to.terminalId)!;
    const expected = orthogonalWirePath(from, to, points, from.vertical, to.vertical);
    const markup = renderToStaticMarkup(createElement(Schematic, {
      document: sheet, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
      onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
    }));
    expect(markup).toContain(`d="${expected}"`);
    expect(sheet.wires[0]).toEqual(wire);
    return expected;
  };
  expect(new Set([path(document), path(movedFrom), path(movedBoth)]).size).toBe(3);
});

it("reroutes automatic wires around unrelated symbols and preserves hand-routed bends", () => {
  const project = createStarterProject();
  const drawing = addFreeSchematicSheet(project).sheets.at(-1)!.document;
  const document = {
    ...drawing,
    components: [
      { id: "start", definitionId: "logic.no-contact", reference: "S1", x: 170, y: 300, rotation: 0 as const, properties: { input: true } },
      { id: "obstacle", definitionId: "logic.no-contact", reference: "S2", x: 480, y: 300, rotation: 0 as const, properties: { input: false } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 790, y: 300, rotation: 0 as const, properties: { input: false } },
    ],
    wires: [{ id: "control", netName: "CONTROL", from: { componentId: "start", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [] }],
  };
  const render = (input: typeof document) => renderToStaticMarkup(createElement(Schematic, {
    document: input, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  const wire = document.wires[0];
  const anchors = terminalAnchors(document);
  const from = anchors.find(({ endpoint }) => endpoint.componentId === "start" && endpoint.terminalId === "out")!;
  const to = anchors.find(({ endpoint }) => endpoint.componentId === "coil" && endpoint.terminalId === "in")!;
  const direct = orthogonalWirePath(from, to);
  expect(render(document)).not.toContain('d="' + direct + '"');
  expect(render(moveComponent(document, "obstacle", 0, 180))).toContain('d="' + direct + '"');
  const points = [{ x: 450, y: 300 }];
  expect(render({ ...document, wires: [{ ...wire, points }] })).toContain('d="' + orthogonalWirePath(from, to, points, from.vertical, to.vertical) + '"');
  expect(document.wires[0].points).toEqual([]);
});


it.each([
  ["a9f73170", 0.5, "B", 6, ["1", "2"]],
  ["a9f74313", 13, "C", 6, ["1", "2", "3", "4", "5", "6"]],
  ["a9f85213", 13, "D", 10, ["1", "2", "3", "4"]],
  ["a9f85463", 63, "D", 10, ["1", "2", "3", "4", "5", "6", "7", "8"]],
  ["a9f04170", 0.5, "C", 6, ["1", "2"]],
  ["a9f06213", 13, "B", 10, ["1", "2", "3", "4"]],
  ["a9f08304", 4, "D", 10, ["1", "2", "3", "4", "5", "6"]],
  ["a9n18401", 63, "B", 15, ["1", "2"]],
  ["a9n18500", 63, "D", 15, ["1", "2", "3", "4"]],
  ["a9n18525", 125, "D", 15, ["1", "2", "3", "4", "5", "6", "7", "8"]],
  ["a9k11106", 6, "B", 10, ["1", "2"]],
  ["a9k12332", 32, "C", 10, ["1", "2", "3", "4", "5", "6"]],
  ["a9k12463", 63, "C", 10, ["1", "2", "3", "4", "5", "6", "7", "8"]],
  ["a9k02463", 63, "C", 6, ["1", "2", "3", "4", "5", "6", "7", "8"]],
] as const)("publishes the exact ratings and anchors for Schneider %s", (code, ratedCurrentA, curve, icnKa, labels) => {
  const id = "schneider.acti9." + code;
  const definition = componentLibraryCatalog.find(entry => entry.id === id);
  expect(definition).toBe(catalogById.get(id));
  expect(definition?.propertiesSchema).toMatchObject({ ratedCurrentA, curve, icnKa });
  expect(definition?.manufacturerRecord?.orderCode).toBe(code.toUpperCase());
  expect(definition?.terminals.map(terminal => terminal.label)).toEqual(labels);
});


it("omits unavailable combinations from the German Acti9 order table", () => {
  expect(catalogById.has("schneider.acti9.a9f03170")).toBe(false);
  expect(catalogById.has("schneider.acti9.a9f08225")).toBe(false);
});


it("publishes iC60L fractional K-curve ratings without assigning Icn to the whole family", () => {
  const part = componentLibraryCatalog.find(entry => entry.id === "schneider.acti9.a9f95272");
  expect(part?.propertiesSchema).toMatchObject({ ratedCurrentA: 1.6, curve: "K" });
  expect(part?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4"]);
  expect(part?.propertiesSchema).not.toHaveProperty("icnKa");
  expect(catalogById.has("schneider.acti9.a9f94272")).toBe(false);
});


it.each([
  ["a9f90273", "MA", 2.5, 4],
  ["a9f90382", "MA", 12.5, 6],
  ["a9n18344", "B", 63, 4],
  ["a9n18377", "C", 125, 8],
  ["a9n18393", "D", 125, 8],
] as const)("publishes Schneider %s with its documented curve and terminal count", (code, curve, ratedCurrentA, terminalCount) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "schneider.acti9." + code);
  expect(part?.propertiesSchema).toMatchObject({ curve, ratedCurrentA });
  expect(part?.terminals).toHaveLength(terminalCount);
  expect(part?.manufacturerRecord?.orderCode).toBe(code.toUpperCase());
});


it.each([
  ["faz-b12-1-sp", "FAZ-B12/1-SP", 12, "B", ["1", "2"]],
  ["faz-c1.6-2", "FAZ-C1.6/2", 1.6, "C", ["1", "2", "3", "4"]],
  ["faz-d63-4", "FAZ-D63/4", 63, "D", ["1", "2", "3", "4", "5", "6", "7", "8"]],
] as const)("maps the Eaton %s order reference and numbered terminals", (suffix, orderCode, ratedCurrentA, curve, labels) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "eaton." + suffix);
  expect(part?.manufacturerRecord).toMatchObject({ orderCode, series: "FAZ UL 1077" });
  expect(part?.propertiesSchema).toMatchObject({ ratedCurrentA, curve });
  expect(part?.terminals.map(terminal => terminal.label)).toEqual(labels);
});


it.each([
  ["faz-b1.5-1-na-sp", "277 VAC", 10, 2],
  ["faz-c13-3-na", "480Y/277 VAC", 14, 6],
  ["faz-c13-4-na", "480Y/277 VAC", 10, 8],
  ["faz-d40-2-na", "240 VAC", 10, 4],
] as const)("publishes the Eaton %s voltage and interruption rating", (code, voltageRating, interruptingRatingKa, terminalCount) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "eaton." + code);
  expect(part?.manufacturerRecord?.series).toBe("FAZ-NA UL 489");
  expect(part?.propertiesSchema).toMatchObject({ voltageRating, interruptingRatingKa });
  expect(part?.terminals).toHaveLength(terminalCount);
});


it.each([
  ["faz-c0.5-1-na-l-sp", "FAZ-C0.5/1-NA-L-SP", 2],
  ["faz-d1.5-3-na-l", "FAZ-D1.5/3-NA-L", 6],
  ["faz-b32-4-na-l", "FAZ-B32/4-NA-L", 8],
] as const)("publishes the 240 V Eaton %s with the exact order code", (suffix, orderCode, terminalCount) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "eaton." + suffix);
  expect(part?.manufacturerRecord).toMatchObject({ orderCode, series: "FAZ-NA-L UL 489" });
  expect(part?.propertiesSchema).toMatchObject({ voltageRating: "240 VAC", interruptingRatingKa: 10 });
  expect(part?.terminals).toHaveLength(terminalCount);
});


it.each([
  ["faz-c0.5-1-rt-l", "FAZ-C0.5/1-RT-L", 2],
  ["faz-d32-4-rt-l", "FAZ-D32/4-RT-L", 8],
] as const)("publishes Eaton %s with ring-tongue terminals", (suffix, orderCode, terminalCount) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "eaton." + suffix);
  expect(part?.manufacturerRecord).toMatchObject({ orderCode, series: "FAZ-RT-L UL 489" });
  expect(part?.propertiesSchema).toMatchObject({ voltageRating: "240 VAC", interruptingRatingKa: 10, terminalStyle: "Ring tongue" });
  expect(part?.terminals).toHaveLength(terminalCount);
});


it("preserves the documented Eaton FAZ-RT packaging and pole exceptions", () => {
  const getPart = (code: string) => componentLibraryCatalog.find(entry => entry.id === "eaton." + code);
  expect(getPart("faz-c35-1-rt")?.manufacturerRecord?.orderCode).toBe("FAZ-C35/1-RT");
  expect(getPart("faz-c13-4-rt")?.propertiesSchema).toMatchObject({
    voltageRating: "480Y/277 VAC", interruptingRatingKa: 14, terminalStyle: "Ring tongue",
  });
  expect(getPart("faz-d40-1-rt-sp")?.terminals).toHaveLength(2);
  expect(getPart("faz-d40-2-rt")).toBeUndefined();
});


it("shows Eaton FAZ-NA-DC polarity and the series voltage condition", () => {
  const onePole = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c2-1-na-dc-sp");
  const twoPole = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c40-2-na-dc");
  expect(onePole?.terminals.map(terminal => terminal.label)).toEqual(["1 (+)", "2 (−)"]);
  expect(onePole?.propertiesSchema.voltageRating).toBe("125 VDC");
  expect(twoPole?.terminals.map(terminal => terminal.label)).toEqual(["1 (+)", "2 (−)", "3 (−)", "4 (+)"]);
  expect(twoPole?.propertiesSchema.voltageRating).toBe("250 VDC with poles in series");
});


it("preserves the Eaton FAZ-RT-DC per-pole voltage exception and polarity", () => {
  const onePole = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c2-1-rt-dc");
  const twoPole = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c50-2-rt-dc");
  expect(onePole?.propertiesSchema).toMatchObject({ voltagePerPoleV: 220, terminalStyle: "Ring tongue" });
  expect(twoPole?.propertiesSchema).toMatchObject({ voltagePerPoleV: 250, breakingCapacityKa: 10 });
  expect(twoPole?.terminals.map(terminal => terminal.label)).toEqual(["1 (+)", "2 (−)", "3 (−)", "4 (+)"]);
});


it("preserves Eaton FAZ K, Z and S curve pole and order-code limits", () => {
  const part = (code: string) => componentLibraryCatalog.find(entry => entry.id === "eaton." + code);
  expect(part("faz-k1.6-1")?.manufacturerRecord?.orderCode).toBe("FAZ-K1.6/1");
  expect(part("faz-k63-4")?.terminals).toHaveLength(8);
  expect(part("faz-z63-2")?.propertiesSchema).toMatchObject({ ratedCurrentA: 63, curve: "Z" });
  expect(part("faz-z63-4")).toBeUndefined();
  expect(part("faz-s40-2")?.terminals).toHaveLength(4);
  expect(part("faz-s40-3")).toBeUndefined();
});


it("exposes Eaton FAZ neutral terminals as a separate switched pair", () => {
  const one = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c16-1n");
  const three = componentLibraryCatalog.find(entry => entry.id === "eaton.faz-c16-3n");
  expect(one?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "N", "N"]);
  expect(three?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
  expect(three?.manufacturerRecord?.topology).toMatchObject({ protectedPoles: 3, neutralTerminals: ["l4-in", "l4-out"] });
});


it.each([
  ["fazt-b1-1", "240770", 15, ["1", "2"]],
  ["fazt-c16-3n", "241165", 15, ["1", "2", "3", "4", "5", "6", "N", "N"]],
  ["fazt-d40-4", "142508", 10, ["1", "2", "3", "4", "5", "6", "7", "8"]],
] as const)("maps Eaton FAZ-T %s to the published article and terminal configuration", (code, articleNumber, icnKa, labels) => {
  const part = componentLibraryCatalog.find(entry => entry.id === "eaton." + code);
  expect(part?.propertiesSchema).toMatchObject({ articleNumber, icnKa });
  expect(part?.terminals.map(terminal => terminal.label)).toEqual(labels);
});


it("preserves Eaton FAZ6 article numbers, switched neutral and German catalogue additions", () => {
  const part = (code: string) => componentLibraryCatalog.find(entry => entry.id === "eaton." + code);
  expect(part("faz6-b6-1")?.propertiesSchema).toMatchObject({ articleNumber: "239001", icnKa: 6 });
  expect(part("faz6-c16-3n")?.propertiesSchema).toMatchObject({ articleNumber: "239173", switchedNeutral: true });
  expect(part("faz6-c16-3n")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
  expect(part("faz6-d63-4")?.propertiesSchema.articleNumber).toBe("168096");
});


it("keeps Eaton FAZ6 article numbers unique across the Spanish and German tables", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "FAZ6 xEffect");
  const articles = parts.map(entry => entry.propertiesSchema.articleNumber);
  expect(new Set(articles).size).toBe(parts.length);
  expect(parts.find(entry => entry.id === "eaton.faz6-b1.5-3")?.propertiesSchema.articleNumber).toBe("177578");
  expect(parts.find(entry => entry.id === "eaton.faz6-d6-1n")?.propertiesSchema.articleNumber).toBe("177527");
});


it("maps SENTRON 5SL4 fractional and switched-neutral order codes to the correct terminals", () => {
  const part = (code: string) => componentLibraryCatalog.find(entry => entry.id === "siemens." + code);
  expect(part("5sl4114-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.3, curve: "C", icnKa: 10 });
  expect(part("5sl4114-6")).toBeUndefined();
  expect(part("5sl4515-8")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "N", "N"]);
  expect(part("5sl4663-6")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("preserves the Siemens 5SL6 B-curve ordering exceptions and neutral terminals", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SL6");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(170);
  expect(part("5sl6102-6")?.propertiesSchema).toMatchObject({ ratedCurrentA: 2, curve: "B", icnKa: 6 });
  expect(part("5sl6202-6")).toBeUndefined();
  expect(part("5sl6614-7")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("uses the exact Siemens 5SY4 A/B/C/D order table including nonliteral current codes", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SY4");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(424);
  expect(part("5sy4118-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 15, curve: "C", icnKa: 10 });
  expect(part("5sy4105-5")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.5, curve: "A" });
  expect(part("5sy4505-5")).toBeUndefined();
  expect(part("5sy4604-5")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("uses the Siemens 5SY6 order limits and 6 kA rating", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SY6");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(179);
  expect(part("5sy6118-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 15, curve: "C", icnKa: 6 });
  expect(part("5sy6518-7")).toBeUndefined();
  expect(part("5sy6606-6")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("preserves Siemens 5SY7 curve availability and 15 kA rating", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SY7");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(276);
  expect(part("5sy7114-8")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.3, curve: "D", icnKa: 15 });
  expect(part("5sy7104-6")).toBeUndefined();
  expect(part("5sy7606-6")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("keeps Siemens 5SY8 models within the published C/D selection table", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SY8");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(216);
  expect(part("5sy8114-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.3, curve: "C", icnKa: 25 });
  expect(part("5sy8163-6")).toBeUndefined();
  expect(part("5sy8663-8")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "N", "N"]);
});


it("shows the Siemens 5SY5 alternating polarity and DC series voltage", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SY5");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(90);
  expect(part("5sy5114-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.3, dcVoltageRating: "220 VDC" });
  expect(part("5sy5404-6")).toBeUndefined();
  expect(part("5sy5463-7")?.propertiesSchema.dcVoltageRating).toBe("880 VDC with poles in series");
  expect(part("5sy5463-7")?.terminals.map(terminal => terminal.label)).toEqual(["1 (−)", "2 (+)", "3 (+)", "4 (−)", "5 (−)", "6 (+)", "7 (+)", "8 (−)"]);
});


it("maps Siemens 5SP4 high-current codes and omits 125 A D-curve combinations", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SP4");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(32);
  expect(part("5sp4191-8")?.propertiesSchema).toMatchObject({ ratedCurrentA: 100, curve: "D", icnKa: 10 });
  expect(part("5sp4292-7")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4"]);
  expect(part("5sp4492-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 125, curve: "C" });
  expect(part("5sp4492-8")).toBeUndefined();
});


it("keeps Siemens 5SL3 pole-specific availability and numbered neutral terminals", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "SENTRON 5SL3");
  const part = (code: string) => parts.find(entry => entry.id === "siemens." + code);
  expect(parts).toHaveLength(145);
  expect(part("5sl3514-7")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.3, curve: "C", icnKa: 4.5 });
  expect(part("5sl3514-7")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "1 N", "2 N"]);
  expect(part("5sl3314-7")).toBeUndefined();
  expect(part("5sl3406-6")).toBeUndefined();
});


it("uses the ABB S200M ordering codes, including the fractional-current suffixes", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200M" && !entry.propertiesSchema.switchedNeutral && typeof entry.propertiesSchema.icnKa === "number");
  const part = (code: string) => parts.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(176);
  expect(part("2cds271001r0984")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.5, curve: "C", icnKa: 10 });
  expect(part("2cds274001r0971")?.propertiesSchema).toMatchObject({ ratedCurrentA: 1.6, curve: "D" });
  expect(part("2cds274001r0971")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
});


it("distinguishes ABB S200 and S200M order codes and breaking capacities", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200" && !entry.propertiesSchema.switchedNeutral && typeof entry.propertiesSchema.icnKa === "number");
  const part = (code: string) => componentLibraryCatalog.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(176);
  expect(part("2cds251001r0981")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.5, curve: "D", icnKa: 6 });
  expect(part("2cds271001r0981")?.propertiesSchema.icnKa).toBe(10);
  expect(part("2cds254001r0034")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
});


it("preserves the ABB S200P rating change above 25 A", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200P" && !entry.propertiesSchema.switchedNeutral && typeof entry.propertiesSchema.icnKa === "number");
  const part = (code: string) => parts.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(172);
  expect(part("2cds281001r0255")?.propertiesSchema).toMatchObject({ ratedCurrentA: 25, curve: "B", icnKa: 25 });
  expect(part("2cds284001r0321")?.propertiesSchema).toMatchObject({ ratedCurrentA: 32, curve: "D", icnKa: 15 });
  expect(part("2cds284001r0321")?.terminals).toHaveLength(8);
});


it("places the ABB NA neutral on its documented numbered terminal pair", () => {
  const part = (code: string) => componentLibraryCatalog.find(entry => entry.id === "abb." + code);
  const single = part("2cds251103r0105");
  const triple = part("2cds273103r0104");
  expect(single?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3N", "4N"]);
  expect(triple?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "7N", "8N"]);
  expect(triple?.manufacturerRecord?.topology).toMatchObject({ neutralTerminals: ["l4-in", "l4-out"], protectedPoles: 3 });
});


it("uses ABB industrial K/Z codes and preserves their separate rating standard", () => {
  const parts = componentLibraryCatalog.filter(entry => ["S200", "S200M"].includes(entry.manufacturerRecord?.series ?? "") && ["K", "Z"].includes(String(entry.propertiesSchema.curve)));
  const part = (code: string) => parts.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(264);
  expect(part("2cds254001r0257")?.propertiesSchema).toMatchObject({ ratedCurrentA: 1.6, curve: "K" });
  expect(part("2cds274001r0428")?.propertiesSchema).toMatchObject({ ratedCurrentA: 10, curve: "Z" });
  expect(part("2cds274001r0428")?.propertiesSchema).not.toHaveProperty("icnKa");
  expect(part("2cds274001r0428")?.standardsReferences).toContain("IEC/EN 60947-2");
});


it("publishes ABB S200P K/Z special current references with physical pole anchors", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200P" && !entry.propertiesSchema.switchedNeutral && ["K", "Z"].includes(String(entry.propertiesSchema.curve)));
  const part = (code: string) => parts.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(144);
  expect(part("2cds281001r0087")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.2, curve: "K" });
  expect(part("2cds283001r0187")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.75, curve: "K" });
  expect(part("2cds284001r0428")?.terminals).toHaveLength(8);
});


it("exposes ABB S200P switched-neutral variants from all listed curves", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200P" && entry.propertiesSchema.switchedNeutral);
  const part = (code: string) => parts.find(entry => entry.id === "abb." + code);
  expect(parts).toHaveLength(160);
  expect(part("2cds281103r0087")?.propertiesSchema).toMatchObject({ ratedCurrentA: 0.2, curve: "K" });
  expect(part("2cds283103r0134")?.propertiesSchema).toMatchObject({ ratedCurrentA: 13, curve: "C", icnKa: 25 });
  expect(part("2cds283103r0134")?.terminals.map(terminal => terminal.label)).toEqual(["1", "2", "3", "4", "5", "6", "7N", "8N"]);
});

it("preserves ABB S200M UC voltage and polarity constraints", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200M UC" && ["B", "C"].includes(String(entry.propertiesSchema.curve)));
  expect(parts).toHaveLength(108);
  const lookup = (poles: number) => parts.find(entry => entry.manufacturerRecord?.orderCode === `2CDS27${poles}061R0164`)!;
  expect(lookup(1).propertiesSchema.dcVoltageRating).toBe("220 VDC");
  expect(lookup(2).propertiesSchema.dcVoltageRating).toBe("440 VDC with two poles in series");
  expect(lookup(3).propertiesSchema.dcVoltageRating).toBeUndefined();
  expect(lookup(4).propertiesSchema.dcVoltageRating).toBe("440 VDC with two poles in series");
  expect(lookup(2).terminals.map(terminal => terminal.label).sort()).toEqual(["1", "2", "3", "4"]);
  expect(lookup(2).manufacturerRecord?.topology).toMatchObject({ polaritySensitive: true });
});

it("uses ABB S200M UC industrial ratings for K and Z curves", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S200M UC" && ["K", "Z"].includes(String(entry.propertiesSchema.curve)));
  expect(parts.filter(entry => entry.propertiesSchema.curve === "K")).toHaveLength(100);
  expect(parts.filter(entry => entry.propertiesSchema.curve === "Z")).toHaveLength(84);
  const lookup = (orderCode: string) => parts.find(entry => entry.manufacturerRecord?.orderCode === orderCode)!;
  expect(lookup("2CDS274061R0187").terminals).toHaveLength(8);
  expect(lookup("2CDS273061R0557").propertiesSchema).toMatchObject({ ratedCurrentA: 40, icuAcKa: 10, icuDcKa: 10 });
  expect(lookup("2CDS271061R0578").propertiesSchema).toMatchObject({ ratedCurrentA: 50, icuAcKa: 6, icuDcKa: 10, dcVoltageRating: "220 VDC" });
  expect(lookup("2CDS271061R0578").propertiesSchema.icnKa).toBeUndefined();
});

it("publishes ABB S800S B/C cage-terminal order codes with linked poles", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S800S" && ["B", "C"].includes(String(entry.propertiesSchema.curve)));
  expect(parts).toHaveLength(176);
  const lookup = (orderCode: string) => parts.find(entry => entry.manufacturerRecord?.orderCode === orderCode)!;
  expect(lookup("2CCF019849R0001").propertiesSchema).toMatchObject({ ratedCurrentA: 0.5, curve: "C", icuKa: 50 });
  const fourPole = lookup("2CCS864001R0845");
  expect(fourPole.propertiesSchema).toMatchObject({ ratedCurrentA: 125, curve: "B" });
  expect(fourPole.terminals.map(terminal => terminal.label).sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
});

it("publishes S800S D/K cage-terminal variants with the correct current codes", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S800S" && ["D", "K"].includes(String(entry.propertiesSchema.curve)));
  expect(parts).toHaveLength(176);
  const lookup = (orderCode: string) => parts.find(entry => entry.manufacturerRecord?.orderCode === orderCode)!;
  expect(lookup("2CCF019961R0001").propertiesSchema).toMatchObject({ ratedCurrentA: 0.5, curve: "K" });
  expect(lookup("2CCS862001R0597").propertiesSchema).toMatchObject({ ratedCurrentA: 63, curve: "K" });
  expect(lookup("2CCS863001R0251").propertiesSchema).toMatchObject({ ratedCurrentA: 25, curve: "D" });
});

it("preserves ABB S800N ordering and its 36 kA rating", () => {
  const parts = componentLibraryCatalog.filter(entry => entry.manufacturerRecord?.series === "S800N");
  expect(parts).toHaveLength(168);
  const fourPole = parts.find(entry => entry.manufacturerRecord?.orderCode === "2CCS894001R0845")!;
  expect(fourPole.propertiesSchema).toMatchObject({ ratedCurrentA: 125, curve: "B", icuKa: 36 });
  expect(fourPole.terminals.map(terminal => terminal.label).sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  expect(parts.every(entry => Number(entry.propertiesSchema.ratedCurrentA) >= 6)).toBe(true);
});
