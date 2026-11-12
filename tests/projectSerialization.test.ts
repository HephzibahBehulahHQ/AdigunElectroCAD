import { describe, expect, it } from "vitest";
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
    sheet.annotations = [{ id: "note-1", text: "Panel feed · 400 V", x: 180, y: 220, color: "#1565c0" }];
    const imported = parseProjectJson(JSON.stringify(input));
    expect(imported.sheets[1].document.annotations).toEqual(sheet.annotations);

    delete input.sheets[0].document.annotations;
    expect(() => parseProjectJson(JSON.stringify(input))).not.toThrow();
  });

  it("rejects annotations outside the sheet or with invalid colors", () => {
    const input = addFreeSchematicSheet(createStarterProject());
    input.sheets[1].document.annotations = [{ id: "note-1", text: "Note", x: 1200, y: 100, color: "red" }];
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("inside the schematic sheet");
    input.sheets[1].document.annotations![0].x = 100;
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("six-digit hex color");
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
    input.sheets[1].document.graphics = [{ id: "shape-1", name: "Bad shape", kind: "polygon" as never, x1: 0, y1: 0, x2: 200, y2: 200, color: "#1565c0", strokeWidth: 2 }];
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
    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("Only rectangles and ellipses");
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

