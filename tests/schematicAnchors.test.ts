import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schematic, terminalAnchors } from "../src/components/Schematic";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";
import { createStarDeltaCircuit } from "../src/projects/starDeltaCircuit";
import { createReversingCircuit } from "../src/projects/reversingCircuit";
import { initialDolState } from "../src/simulation/dolSimulator";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders a user-selected component name beside its editable indication", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  const lamp = { ...createDolMotorStarter().components.find((component) => component.definitionId === "user.indicator-lamp")!, id: "named-lamp", x: 500, y: 350, displayName: "Pump room", properties: { indication: "Ready" } };
  document.components.push(lamp);
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: lamp.id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain("Pump room · Ready");
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
