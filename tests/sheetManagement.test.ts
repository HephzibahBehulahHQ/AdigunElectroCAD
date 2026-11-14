import { expect, it } from "vitest";
import { createMotorStarterWorkbook, createStarterProject } from "../src/projects/starterProject";
import { validateProjectContinuations } from "../src/projects/projectContinuations";
import { removeProjectSheet, reorderProjectSheet } from "../src/projects/sheetManagement";

it("reorders tabs without changing continuation source identities or validity", () => {
  const project = createMotorStarterWorkbook();
  const sourceId = project.sheets[0].id;
  const continuation = project.continuations![0];
  const reordered = reorderProjectSheet(project, sourceId, project.sheets[3].id);
  expect(reordered.sheets[3].id).toBe(sourceId);
  expect(reordered.continuations![0].points[0]).toEqual(continuation.points[0]);
  expect(validateProjectContinuations(reordered)).toEqual([]);
  expect(reorderProjectSheet(reordered, sourceId, sourceId)).toBe(reordered);
});

it("removes the chosen sheet, drops only affected links, and keeps undoable source data", () => {
  const project = createMotorStarterWorkbook();
  const target = project.sheets[4];
  const before = JSON.stringify(project);
  const result = removeProjectSheet(project, target.id);
  expect(result.removed).toBe(true);
  expect(result.project.sheets).toHaveLength(9);
  expect(result.removedContinuations).toBe(4);
  expect(result.project.continuations).toHaveLength(32);
  expect(validateProjectContinuations(result.project)).toEqual([]);
  expect(JSON.stringify(project)).toBe(before);
});

it("removes nets whose original source sheet is removed and never removes the last sheet", () => {
  const workbook = createMotorStarterWorkbook();
  const removedSource = removeProjectSheet(workbook, workbook.sheets[0].id);
  expect(removedSource.removed).toBe(true);
  expect(removedSource.removedSourceContinuations).toBe(36);
  expect(removedSource.project.continuations).toEqual([]);
  const single = createStarterProject();
  expect(removeProjectSheet(single, single.sheets[0].id)).toMatchObject({ project: single, removed: false });
});
