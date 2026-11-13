import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { schematicGraphicToSymbolGraphic, schematicGraphicsToSymbolGraphics } from "../src/cad/userSymbol";
import { Schematic } from "../src/components/Schematic";
import type { SchematicGraphic } from "../src/types/electrical";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

const shape: SchematicGraphic = { id: "graphic-1", name: "Fan blade", kind: "polyline", x1: 300, y1: 200, x2: 360, y2: 240, points: [{ x: 300, y: 220 }, { x: 330, y: 200 }, { x: 360, y: 220 }, { x: 330, y: 240 }], color: "#c62828", strokeWidth: 3 };

describe("user-drawn component symbols", () => {
  it("centers and fits drafted geometry into reusable component-local coordinates", () => {
    expect(schematicGraphicToSymbolGraphic(shape)).toMatchObject({
      kind: "polyline", x1: -30, y1: -20, x2: 30, y2: 20, color: "#c62828", strokeWidth: 3,
      points: [{ x: -30, y: 0 }, { x: 0, y: -20 }, { x: 30, y: 0 }, { x: 0, y: 20 }],
    });
  });

  it("keeps multiple drafted shapes in one shared centered composition", () => {
    const first: SchematicGraphic = { id: "a", name: "A", kind: "line", x1: 0, y1: 20, x2: 20, y2: 20, color: "#123456", strokeWidth: 2 };
    const second: SchematicGraphic = { id: "b", name: "B", kind: "rectangle", x1: 100, y1: 0, x2: 200, y2: 40, color: "#abcdef", fillColor: "#eeeeee", strokeWidth: 4 };
    expect(schematicGraphicsToSymbolGraphics([first, second])).toMatchObject([
      { kind: "line", x1: -45, y1: 0, x2: -36, y2: 0, color: "#123456", strokeWidth: 2 },
      { kind: "rectangle", x1: 0, y1: -9, x2: 45, y2: 9, color: "#abcdef", fillColor: "#eeeeee", strokeWidth: 4 },
    ]);
  });

  it("renders authored shape geometry and default terminal labels on the schematic", () => {
    const project = addFreeSchematicSheet(createStarterProject());
    const document = project.sheets[1].document;
    const component = { id: "user-shape-1", definitionId: "user.drawn-symbol", reference: "U1", displayName: "Fan blade", x: 500, y: 360, rotation: 0 as const, properties: { indication: "User symbol" }, customSymbolGraphics: [schematicGraphicToSymbolGraphic(shape)] };
    document.components.push(component);
    const markup = renderToStaticMarkup(createElement(Schematic, {
      document, selectedComponentId: component.id, selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
      onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
    }));
    expect(markup).toContain('points="470,360 500,340 530,360 500,380"');
    expect(markup).toContain('stroke="#c62828"');
    expect(markup).toContain(">T1</text>");
    expect(markup).toContain(">T2</text>");
  });
});
