import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Schematic } from "../src/components/Schematic";
import { catalogById } from "../src/catalog/dolCatalog";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders named line, rectangle and ellipse drafting graphics in their chosen colors", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  document.graphics = [
    { id: "line-1", name: "Control boundary", kind: "line", x1: 100, y1: 120, x2: 200, y2: 180, color: "#1565c0", strokeWidth: 2 },
    { id: "rect-1", name: "Panel outline", kind: "rectangle", x1: 240, y1: 160, x2: 440, y2: 320, color: "#16814b", fillColor: "#ffcc80", strokeWidth: 3 },
    { id: "ellipse-1", name: "User mark", kind: "ellipse", x1: 500, y1: 160, x2: 620, y2: 240, color: "#7b3fa1", strokeWidth: 1 },
  ];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", selectedGraphicId: "rect-1", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
    onGraphicResize: () => {},
  }));
  expect(markup).toContain('data-graphic-kind="line"');
  expect(markup).toContain('data-graphic-kind="rectangle"');
  expect(markup).toContain('data-graphic-kind="ellipse"');
  expect(markup).toContain('stroke="#1565c0"');
  expect(markup).toContain('fill="#ffcc80"');
  expect(markup).toContain('data-resize-handle="nw"');
  expect(markup).toContain('data-resize-handle="se"');
  expect(markup).toContain("drafting geometry; not an electrical connection");
});

it("shows endpoint resize handles for a selected line", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  document.graphics = [{ id: "line-1", name: "Control boundary", kind: "line", x1: 100, y1: 120, x2: 200, y2: 180, color: "#1565c0", strokeWidth: 2 }];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", selectedGraphicId: "line-1", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {}, onGraphicResize: () => {},
  }));
  expect(markup).toContain('data-resize-handle="start"');
  expect(markup).toContain('data-resize-handle="end"');
});

it("renders a user-selected component drafting color without changing its catalog properties", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  const seed = createStarterProject().sheets[0].document.components[0];
  document.components.push({ ...seed, id: "draft-color-test", x: 300, y: 300, properties: { ...seed.properties } });
  document.components[0].draftingColor = "#7b3fa1";
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: document.components[0].id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain('style="--component-ink:#7b3fa1"');
  expect(document.components[0].properties).not.toHaveProperty("draftingColor");
});

it("renders editable electrical wire colors separately from terminal topology", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  const seed = { ...createStarterProject().sheets[0].document.components[0], id: "wire-color-test", x: 300, y: 300 };
  document.components.push(seed);
  const terminals = catalogById.get(seed.definitionId)!.terminals;
  document.wires = [{
    id: "wire-color-1",
    from: { componentId: seed.id, terminalId: terminals[0].id },
    to: { componentId: seed.id, terminalId: terminals[1].id },
    points: [], netName: "TEST_NET", draftingColor: "#c62828",
  }];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: seed.id, simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain('style="stroke:#c62828"');
  expect(document.wires[0]).toMatchObject({ netName: "TEST_NET", draftingColor: "#c62828" });
  expect(document.wires[0].from).toEqual({ componentId: seed.id, terminalId: terminals[0].id });
});

it("renders editable multi-point paths and exposes a handle for each vertex", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  document.graphics = [
    { id: "path-1", name: "Conduit route", kind: "polyline", x1: 100, y1: 100, x2: 220, y2: 180, points: [{ x: 100, y: 100 }, { x: 160, y: 100 }, { x: 160, y: 180 }, { x: 220, y: 180 }], color: "#1565c0", strokeWidth: 3 },
    { id: "polygon-1", name: "Panel region", kind: "polygon", x1: 320, y1: 100, x2: 460, y2: 220, points: [{ x: 320, y: 100 }, { x: 460, y: 120 }, { x: 420, y: 220 }, { x: 340, y: 200 }], color: "#19324f", fillColor: "#ffcc80", strokeWidth: 2 },
  ];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", selectedGraphicId: "polygon-1", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {}, onGraphicVertexMove: () => {},
  }));
  expect(markup).toContain('data-graphic-kind="polyline"');
  expect(markup).toContain('data-graphic-kind="polygon"');
  expect(markup).toContain('points="100,100 160,100 160,180 220,180"');
  expect(markup).toContain('fill="#ffcc80"');
  expect(markup).toContain('data-vertex-handle="0"');
  expect(markup).toContain('data-vertex-handle="3"');
});
