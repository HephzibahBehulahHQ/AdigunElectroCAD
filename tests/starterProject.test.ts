import { describe, expect, it } from "vitest";
import { addFreeSchematicSheet, createStarterProject, replaceSheetDocument } from "../src/projects/starterProject";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { MAX_PROJECT_SHEETS } from "../src/projects/projectLimits";

describe("multi-sheet starter project", () => {
  it("adds an independent free schematic sheet", () => {
    const project = createStarterProject();
    const next = addFreeSchematicSheet(project);
    expect(project.sheets).toHaveLength(1);
    expect(next.sheets).toHaveLength(2);
    expect(next.sheets[1]).toMatchObject({ kind: "free-schematic", name: "Free schematic 1" });
    expect(next.sheets[1].document).toMatchObject({ components: [], wires: [] });
    expect(next.sheets[0].document.components).toHaveLength(11);
    expect(next.sheets[0].document.components.filter((component) => component.definitionId === "user.indicator-lamp").map((component) => component.reference)).toEqual(["H1", "H2", "H3"]);
  });
  it("updates only the selected sheet document", () => {
    const project = addFreeSchematicSheet(createStarterProject());
    const sheet = project.sheets[1];
    const next = replaceSheetDocument(project, sheet.id, { ...sheet.document, name: "Control extension", revision: 2 });
    expect(next.sheets[1].document.name).toBe("Control extension");
    expect(next.sheets[0].document.name).toBe("DOL Motor Starter — 7.5 kW");
  });
});

it("allocates a unique id after imported sheet numbering has gaps", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  project.sheets[1].id = "sheet-free-2";
  const before = JSON.stringify(project);
  const extended = addFreeSchematicSheet(project);
  expect(new Set(extended.sheets.map((sheet) => sheet.id)).size).toBe(extended.sheets.length);
  expect(extended.sheets.at(-1)!.id).not.toBe("sheet-free-2");
  expect(parseProjectJson(JSON.stringify(extended))).toEqual(extended);
  expect(JSON.stringify(project)).toBe(before);
});

it("avoids an id already used by a renamed reference sheet", () => {
  const project = createStarterProject();
  project.sheets[0].id = "sheet-free-1";
  const extended = addFreeSchematicSheet(project);
  expect(extended.sheets[1].id).not.toBe(project.sheets[0].id);
  expect(parseProjectJson(JSON.stringify(extended))).toEqual(extended);
});

it("can save and reload the maximum sheet count and rejects another addition without mutation", () => {
  let project = createStarterProject();
  while (project.sheets.length < MAX_PROJECT_SHEETS) project = addFreeSchematicSheet(project);
  const before = JSON.stringify(project);
  expect(parseProjectJson(before).sheets).toHaveLength(MAX_PROJECT_SHEETS);
  expect(() => addFreeSchematicSheet(project)).toThrow("at most");
  expect(JSON.stringify(project)).toBe(before);
});

