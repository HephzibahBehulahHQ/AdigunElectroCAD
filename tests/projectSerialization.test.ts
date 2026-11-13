import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

function freeSheetWithComponent() {
  const project = addFreeSchematicSheet(createStarterProject());
  const seed = createStarterProject().sheets[0].document.components[0];
  project.sheets[1].document.components.push({ ...seed, id: "test-component", x: 300, y: 300, properties: { ...seed.properties } });
  return project;
}

describe("project JSON import validation", () => {
  it("rejects duplicate sheet ids that would make edits target multiple sheets", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].id = input.sheets[0].id;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("unique sheet id");
  });
  it("rejects duplicate ids after whitespace normalization", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].id = ` ${input.sheets[0].id} `;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("unique sheet id");
  });
  it.each(["free-schematic", "reference-dol"] as const)("rejects an incompatible %s rendering model", (kind) => {
    const input = addFreeSchematicSheet(createStarterProject());
    const sheet = kind === "free-schematic" ? input.sheets[0] : input.sheets[1];
    sheet.kind = kind;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("type does not match");
  });
  it("round-trips a project containing both reference and free sheets", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    expect(parseProjectJson(JSON.stringify(input))).toEqual(input);
  });
  it("round-trips a valid starter project", () => {
    const original = createStarterProject();
    const imported = parseProjectJson(JSON.stringify(original));

    expect(imported.name).toBe(original.name);
    expect(imported.sheets[0].document.wires).toHaveLength(20);
  });

  it("persists optional component drafting colors and accepts older projects without them", () => {
    const input = freeSheetWithComponent();
    input.sheets[1].document.components[0].draftingColor = "#7b3fa1";
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.components[0].draftingColor).toBe("#7b3fa1");
    delete input.sheets[1].document.components[0].draftingColor;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it("persists optional user-selected component names and accepts older projects without them", () => {
    const input = freeSheetWithComponent();
    input.sheets[1].document.components[0].displayName = "Pump room supply";
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.components[0].displayName).toBe("Pump room supply");
    delete input.sheets[1].document.components[0].displayName;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
    input.sheets[1].document.components[0].displayName = "x".repeat(81);
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("component display name");
  });

  it("persists editable terminal labels and rejects labels for unknown terminals", () => {
    const input = freeSheetWithComponent();
    const component = input.sheets[1].document.components[0];
    const terminalId = catalogById.get(component.definitionId)!.terminals[0].id;
    component.terminalLabels = { [terminalId]: "LINE+" };
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.components[0].terminalLabels).toEqual(component.terminalLabels);
    component.terminalLabels = { "not-a-terminal": "LINE+" };
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("not a catalog terminal");
  });

  it("rejects blank or overlong terminal display labels", () => {
    const input = freeSheetWithComponent();
    const component = input.sheets[1].document.components[0];
    const terminalId = catalogById.get(component.definitionId)!.terminals[0].id;
    for (const label of ["", "x".repeat(9)]) {
      component.terminalLabels = { [terminalId]: label };
      expect(() => parseProjectJson(JSON.stringify(input))).toThrow("non-empty and at most 8 characters");
    }
  });

  it("persists user-defined component data without requiring it in older projects", () => {
    const input = freeSheetWithComponent();
    input.sheets[1].document.components[0].customProperties = { Indicator: "Green", "Nominal voltage": "User selected" };
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.components[0].customProperties).toEqual(input.sheets[1].document.components[0].customProperties);
    delete input.sheets[1].document.components[0].customProperties;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it.each([
    { " ": "value" },
    { ["__proto__"]: "value" },
    { "A": "one", "a": "two" },
    { "Long value": "x".repeat(241) },
  ])("rejects invalid user-defined component data", (customProperties) => {
    const input = freeSheetWithComponent();
    input.sheets[1].document.components[0].customProperties = customProperties;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow(/custom component field/i);
  });

  it("rejects malformed component drafting colors", () => {
    const input = freeSheetWithComponent();
    input.sheets[1].document.components[0].draftingColor = "blue";
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Component drafting color");
  });

  it("persists optional wire drafting colors and accepts older projects without them", () => {
    const input = createStarterProject();
    input.sheets[0].document.wires[0].draftingColor = "#7b3fa1";
    expect(parseProjectJson(JSON.stringify(input)).sheets[0].document.wires[0].draftingColor).toBe("#7b3fa1");
    delete input.sheets[0].document.wires[0].draftingColor;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it("rejects malformed wire drafting colors", () => {
    const input = createStarterProject();
    input.sheets[0].document.wires[0].draftingColor = "violet";
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Wire drafting color");
  });

  it("persists editable text annotations and accepts older projects without annotations", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    const sheet = input.sheets[1].document;
    sheet.annotations = [{ id: "note-1", text: "Panel feed · 400 V\nTerminal A1 · branch K1", x: 180, y: 220, color: "#1565c0", fontSize: 28, rotation: 45, textAnchor: "middle", fontWeight: 700 }];
    const imported = parseProjectJson(JSON.stringify(input));
    expect(imported.sheets[1].document.annotations).toEqual(sheet.annotations);
    delete sheet.annotations[0].textAnchor;
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.annotations).toEqual(sheet.annotations);
    delete sheet.annotations[0].fontWeight;
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.annotations).toEqual(sheet.annotations);
    delete sheet.annotations[0].rotation;
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.annotations).toEqual(sheet.annotations);
    delete sheet.annotations[0].fontSize;
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.annotations).toEqual(sheet.annotations);

    delete input.sheets[0].document.annotations;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it("rejects annotations outside the sheet or with invalid colors", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.annotations = [{ id: "note-1", text: "Note", x: 1200, y: 100, color: "red" }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("inside the schematic sheet");
    input.sheets[1].document.annotations![0].x = 100;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("six-digit hex color");
    input.sheets[1].document.annotations![0].color = "#1565c0";
    input.sheets[1].document.annotations![0].fontSize = 49;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("between 8 and 48");
    input.sheets[1].document.annotations![0].fontSize = 7;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("between 8 and 48");
    input.sheets[1].document.annotations![0].fontSize = 18;
    input.sheets[1].document.annotations![0].rotation = 360;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("between 0 and 359 degrees");
    input.sheets[1].document.annotations![0].rotation = -1;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("between 0 and 359 degrees");
    input.sheets[1].document.annotations![0].rotation = 0;
    input.sheets[1].document.annotations![0].textAnchor = "bogus" as "start";
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("alignment must be left, center, or right");
    input.sheets[1].document.annotations![0].textAnchor = "start";
    input.sheets[1].document.annotations![0].fontWeight = 500 as 600;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("weight must be 400, 600, or 700");
    input.sheets[1].document.annotations![0].fontWeight = 600;
    input.sheets[1].document.annotations![0].text = Array.from({ length: 9 }, () => "line").join("\n");
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("at most 8 lines");
  });

  it("persists user-drawn graphics and accepts earlier projects without graphics", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.graphics = [
      { id: "line-1", name: "Control boundary", kind: "line", x1: 100, y1: 120, x2: 200, y2: 180, color: "#1565c0", strokeWidth: 2 },
      { id: "rect-1", name: "Panel outline", kind: "rectangle", x1: 240, y1: 160, x2: 440, y2: 320, color: "#16814b", fillColor: "#ffcc80", strokeWidth: 3 },
      { id: "ellipse-1", name: "User mark", kind: "ellipse", x1: 500, y1: 160, x2: 620, y2: 240, color: "#7b3fa1", strokeWidth: 1 },
    ];
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.graphics).toEqual(input.sheets[1].document.graphics);
    delete input.sheets[0].document.graphics;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it("rejects malformed user-drawn graphics", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.graphics = [{ id: "shape-1", name: "Bad shape", kind: "star" as never, x1: 0, y1: 0, x2: 200, y2: 200, color: "#1565c0", strokeWidth: 2 }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Graphic kind");
    input.sheets[1].document.graphics[0].kind = "rectangle";
    input.sheets[1].document.graphics[0].x2 = 2;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("span at least 4 units");
  });

  it("validates optional shape fill colors and keeps lines unfilled", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.graphics = [{ id: "shape-1", name: "Panel", kind: "rectangle", x1: 0, y1: 0, x2: 100, y2: 80, color: "#1565c0", fillColor: "notacol", strokeWidth: 2 }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Graphic fill color");
    input.sheets[1].document.graphics[0].fillColor = "#ffcc80";
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.graphics?.[0].fillColor).toBe("#ffcc80");
    input.sheets[1].document.graphics[0].kind = "line";
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Only rectangles, ellipses and polygons");
  });

  it("persists editable polylines and filled polygons with bounded vertices", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.graphics = [
      { id: "path-1", name: "Conduit route", kind: "polyline", x1: 100, y1: 100, x2: 220, y2: 180, points: [{ x: 100, y: 100 }, { x: 160, y: 100 }, { x: 160, y: 180 }, { x: 220, y: 180 }], color: "#1565c0", strokeWidth: 3 },
      { id: "polygon-1", name: "Panel region", kind: "polygon", x1: 320, y1: 100, x2: 460, y2: 220, points: [{ x: 320, y: 100 }, { x: 460, y: 120 }, { x: 420, y: 220 }, { x: 340, y: 200 }], color: "#19324f", fillColor: "#ffcc80", strokeWidth: 2 },
    ];
    expect(parseProjectJson(JSON.stringify(input)).sheets[1].document.graphics).toEqual(input.sheets[1].document.graphics);
  });

  it("rejects paths with too few vertices, invalid bounds or zero-area polygons", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.graphics = [{ id: "path-1", name: "Bad path", kind: "polyline", x1: 0, y1: 0, x2: 100, y2: 100, points: [{ x: 0, y: 0 }], color: "#1565c0", strokeWidth: 2 }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("at least 2 distinct");
    input.sheets[1].document.graphics[0].points = [{ x: 0, y: 0 }, { x: 1200, y: 100 }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("inside the schematic sheet");
    input.sheets[1].document.graphics[0] = { id: "polygon-1", name: "Bad polygon", kind: "polygon", x1: 0, y1: 0, x2: 100, y2: 100, points: [{ x: 0, y: 0 }, { x: 40, y: 40 }, { x: 100, y: 100 }], color: "#1565c0", strokeWidth: 2 };
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("polygons must enclose an area");
  });

  it("rejects user-drawn graphics on the fixed reference sheet where they would not render", () => {
    const input = createStarterProject();
    input.sheets[0].document.graphics = [{ id: "line-1", name: "Draft line", kind: "line", x1: 10, y1: 10, x2: 80, y2: 80, color: "#1565c0", strokeWidth: 2 }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("free schematic sheets only");
  });

  it("rejects unknown device definitions", () => {
    const input = JSON.parse(JSON.stringify(createStarterProject()));
    input.sheets[0].document.components[0].definitionId = "unknown.device";

    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("not in the installed catalog");
  });

  it("rejects overlong component references before they can affect drawing labels", () => {
    const input = JSON.parse(JSON.stringify(createStarterProject()));
    input.sheets[0].document.components[0].reference = "R".repeat(13);

    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("component reference");
  });
});

