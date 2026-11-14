import { describe, expect, it } from "vitest";
import { addFreeSchematicSheet, createMotorStarterWorkbook, createStarterProject, replaceSheetDocument } from "../src/projects/starterProject";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { validateProjectContinuations } from "../src/projects/projectContinuations";
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

it("starts with a ten-sheet motor-feeder project linked by source and destination terminals", () => {
  const project = createMotorStarterWorkbook();
  expect(project.sheets).toHaveLength(10);
  expect(project.sheets.map((sheet) => sheet.name)).toEqual(["Supply · 9 feeders", ...Array.from({ length: 9 }, (_, index) => `M${index + 1} · DOL feeder`)]);
  expect(project.continuations).toHaveLength(36);
  expect(validateProjectContinuations(project)).toEqual([]);
  for (let ordinal = 1; ordinal <= 9; ordinal++) {
    for (const [conductor, sourceGrid, breakerGrid] of [["L1", "G15", "M8"], ["L2", "K15", "O8"], ["L3", "G15", "Q8"]] as const) {
      const continuation = project.continuations!.find((item) => item.id === `feed-m${ordinal}-${conductor.toLowerCase()}`)!;
      expect(continuation.points.map((point) => point.gridReference)).toEqual([sourceGrid, breakerGrid]);
    }
    const pe = project.continuations!.find((item) => item.id === `feed-m${ordinal}-pe`)!;
    expect(pe.points.map((point) => point.gridReference)).toEqual(["K15", "AS27"]);
    const sheet = project.sheets[ordinal];
    expect(sheet.document.components.map((component) => component.reference)).toEqual(expect.arrayContaining([`Q${ordinal}`, `KM${ordinal}`, `F${ordinal}`, `M${ordinal}`]));
    expect(sheet.document.wires.length).toBeGreaterThanOrEqual(16);
    expect(new Set(sheet.document.wires.map((wire) => wire.id)).size).toBe(sheet.document.wires.length);
  }
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

