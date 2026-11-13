import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Schematic } from "../src/components/Schematic";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders user-owned text notes with their chosen color on free schematic sheets", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  document.annotations = [{ id: "note-1", text: "CONTROL BRANCH · USER DEFINED\nTerminal A1 · branch K1", x: 200, y: 240, color: "#7b3fa1", fontSize: 32, rotation: 32, textAnchor: "middle", fontWeight: 700, lineSpacing: 1.5, fontStyle: "italic" }];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {}, selectedAnnotationId: "note-1", onAnnotationSelect: () => {},
  }));
  expect(markup).toContain("CONTROL BRANCH · USER DEFINED");
  expect(markup).toContain("Terminal");
  expect(markup).toContain("<tspan");
  expect(markup).toContain('fill="#7b3fa1"');
  expect(markup).toContain('font-size="32"');
  expect(markup).toContain('rotate(32)');
  expect(markup).toContain('text-anchor="middle"');
  expect(markup).toContain('font-weight="700"');
  expect(markup).toContain('dy="48"');
  expect(markup).toContain('font-style="italic"');
});

