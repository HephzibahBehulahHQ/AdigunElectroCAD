import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { terminalAnchors } from "../src/components/Schematic";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "../src/components/functionalSymbols";
import { createStarDeltaCircuit } from "../src/projects/starDeltaCircuit";
import { createReversingCircuit } from "../src/projects/reversingCircuit";
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


