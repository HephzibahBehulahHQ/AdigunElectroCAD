import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Schematic } from "../src/components/Schematic";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

it("renders every Shift-selected placed component as selected", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const document = project.sheets[1].document;
  const templates = project.sheets[0].document.components.slice(0, 2);
  document.components = templates.map((component, index) => ({ ...component, id: `free-${index}`, x: 180 + index * 260, y: 200 }));
  const markup = renderToStaticMarkup(createElement(Schematic, {
    document, selectedComponentId: "free-1", selectedComponentIds: ["free-0", "free-1"], selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
    onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup.match(/class="schematic-component selected"/g)).toHaveLength(2);
});
