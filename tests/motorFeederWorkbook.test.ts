import { expect, it } from "vitest";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { validateProjectContinuations } from "../src/projects/projectContinuations";
import { createMotorStarterWorkbook } from "../src/projects/starterProject";

it("builds a ten-sheet motor-feeder project with real wired branches and terminal-level phase/PE continuations", () => {
  const project = createMotorFeederWorkbook();
  expect(project.sheets).toHaveLength(10);
  expect(project.continuations).toHaveLength(36);
  expect(validateProjectContinuations(project)).toEqual([]);
  expect(project.sheets[0].document.components.map((component) => component.definitionId)).toEqual(["supply.three-phase"]);

  for (let ordinal = 1; ordinal <= 9; ordinal++) {
    const sheet = project.sheets[ordinal];
    const references = sheet.document.components.map((component) => component.reference);
    expect(references).toContain(`Q${ordinal}`);
    expect(references).toContain(`KM${ordinal}`);
    expect(references).toContain(`F${ordinal}`);
    expect(references).toContain(`M${ordinal}`);
    expect(sheet.document.wires.length).toBeGreaterThanOrEqual(16);
    for (const phase of ["l1", "l2", "l3"]) {
      expect(project.continuations?.some((net) => net.points[1].sheetId === sheet.id && net.points[1].endpoint.terminalId === `${phase}-in`)).toBe(true);
    }
    expect(project.continuations?.some((net) => net.points[1].sheetId === sheet.id && net.points[1].endpoint.terminalId === "pe")).toBe(true);
  }
});

it("uses the real ten-sheet feeder workbook as the motor starter project", () => {
  expect(createMotorStarterWorkbook().sheets).toHaveLength(10);
});
