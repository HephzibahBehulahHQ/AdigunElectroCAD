import { describe, expect, it } from "vitest";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";

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

