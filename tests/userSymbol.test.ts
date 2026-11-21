import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { schematicGraphicToSymbolGraphic, schematicGraphicsToSymbolGraphics } from "../src/cad/userSymbol";
import { Schematic } from "../src/components/Schematic";
import { canPlaceComponent, positionCustomTerminal, transformComponent } from "../src/cad/documentOps";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { catalogById } from "../src/catalog/dolCatalog";
import type { ComponentInstance, SchematicGraphic } from "../src/types/electrical";
import { initialDolState } from "../src/simulation/dolSimulator";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

const shape: SchematicGraphic = { id: "graphic-1", name: "Fan blade", kind: "polyline", x1: 300, y1: 200, x2: 360, y2: 240, points: [{ x: 300, y: 220 }, { x: 330, y: 200 }, { x: 360, y: 220 }, { x: 330, y: 240 }], color: "#c62828", strokeWidth: 3 };

describe("user-drawn component symbols", () => {
  it("rejects a blocked terminal edit atomically and keeps a clear edit attached to the same endpoint", () => {
    const document = addFreeSchematicSheet(createStarterProject()).sheets[1].document;
    const definition = catalogById.get("user.drawn-symbol")!;
    const custom: ComponentInstance = {
      id: "custom", definitionId: definition.id, reference: "U1", x: -300, y: -180, rotation: 0, properties: {},
      customTerminals: [...definition.terminals, { id: "t3", label: "T3", kind: "control", direction: "bidirectional" }],
    };
    const neighbor: ComponentInstance = { ...custom, id: "neighbor", reference: "U2", x: -175 };
    const from = { componentId: custom.id, terminalId: "t3" };
    document.components = [custom, neighbor];
    document.wires = [{ id: "control-wire", from, to: { componentId: neighbor.id, terminalId: "t1" }, points: [] }];

    expect(positionCustomTerminal(document, custom.id, "t3", { x: 60, y: 0 })).toMatchObject({ ok: false });
    expect(positionCustomTerminal(document, custom.id, "t3", { x: 60, y: 0 }).document).toBe(document);
    const moved = positionCustomTerminal(document, custom.id, "t3", { x: 45, y: 0 });
    expect(moved.ok).toBe(true);
    expect(moved.document.wires).toBe(document.wires);
    expect(terminalAnchors(moved.document).find((anchor) => anchor.endpoint.componentId === custom.id && anchor.endpoint.terminalId === "t3")).toMatchObject({ x: -255, y: -180 });
  });

  it("checks custom geometry and displaced pins on both sides of placement and rotation", () => {
    const document = addFreeSchematicSheet(createStarterProject()).sheets[1].document;
    const custom: ComponentInstance = {
      id: "custom", definitionId: "user.drawn-symbol", reference: "U1", x: -300, y: -300, rotation: 0, properties: {},
      customSymbolGraphics: [{ kind: "line", x1: 0, y1: 0, x2: 180, y2: 0, color: "#000000", strokeWidth: 2 }],
      customTerminalOffsets: { t1: { x: -180, y: 0 } },
    };
    const peer: ComponentInstance = { ...custom, id: "peer", x: -130, customSymbolGraphics: undefined, customTerminalOffsets: undefined };
    expect(canPlaceComponent([custom], "", peer.x, peer.y, peer.definitionId)).toBe(false);
    expect(canPlaceComponent([custom, { ...peer, x: -470 }], custom.id, custom.x, custom.y)).toBe(false);
    expect(transformComponent({ ...document, components: [custom, peer] }, custom.id, { kind: "rotate", rotation: 90 }).ok).toBe(true);
    expect(transformComponent({ ...document, components: [custom, { ...peer, x: -300, y: -130 }] }, custom.id, { kind: "rotate", rotation: 90 }).ok).toBe(false);
  });

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
