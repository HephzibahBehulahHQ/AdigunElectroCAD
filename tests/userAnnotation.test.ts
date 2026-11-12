import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Schematic } from "../src/components/Schematic";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders user-owned text notes with their chosen color on free schematic sheets", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  document.annotations = [{ id: "note-1", text: "CONTROL BRANCH · USER DEFINED", x: 200, y: 240, color: "#7b3fa1" }];
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {}, selectedAnnotationId: "note-1", onAnnotationSelect: () => {},
  }));
  expect(markup).toContain("CONTROL BRANCH · USER DEFINED");
  expect(markup).toContain('fill="#7b3fa1"');
});

