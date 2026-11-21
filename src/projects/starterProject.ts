import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import { createMotorFeederWorkbook } from "./motorFeederWorkbook";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitDocument, CircuitSheet, ElectricalProject } from "../types/electrical";
import { MAX_PROJECT_SHEETS } from "./projectLimits";

export const createStarterProject = (): ElectricalProject => ({
  id: "reference-dol-project",
  name: "DOL Motor Starter — 7.5 kW",
  description: "Editable direct-on-line motor starter project with a reference circuit and additional free schematic sheets.",
  revision: 1,
  sheets: [{ id: "sheet-dol", name: "Power & Control Circuit", kind: "reference-dol", document: createSourcedDolMotorStarter() }],
});

export function createBlankProject(): ElectricalProject {
  return {
    id: "untitled-electrical-project",
    name: "Untitled project",
    description: "New blank electrical project.",
    revision: 1,
    sheets: [{ id: "sheet-1", name: "Sheet 1", kind: "free-schematic", document: blankDocument("sheet-1", "Sheet 1") }],
  };
}

export const createMotorStarterWorkbook = createMotorFeederWorkbook;

export function addFreeSchematicSheet(project: ElectricalProject): ElectricalProject {
  if (project.sheets.length >= MAX_PROJECT_SHEETS) throw new Error(`A project supports at most ${MAX_PROJECT_SHEETS} sheets.`);
  const usedIds = new Set(project.sheets.map((sheet) => sheet.id));
  let ordinal = project.sheets.filter((sheet) => sheet.kind === "free-schematic").length + 1;
  while (usedIds.has(`sheet-free-${ordinal}`)) ordinal++;
  const sheet: CircuitSheet = {
    id: `sheet-free-${ordinal}`,
    name: `Free schematic ${ordinal}`,
    kind: "free-schematic",
    document: blankDocument(`free-schematic-${ordinal}`, `Free schematic ${ordinal}`),
  };
  return { ...project, revision: project.revision + 1, sheets: [...project.sheets, sheet] };
}

export function replaceSheetDocument(project: ElectricalProject, sheetId: string, document: CircuitDocument): ElectricalProject {
  return { ...project, revision: project.revision + 1, sheets: project.sheets.map((sheet) => sheet.id === sheetId ? { ...sheet, document } : sheet) };
}

export function loadTemplateIntoSheet(project: ElectricalProject, sheetId: string, template: ProjectTemplate): ElectricalProject {
  if (!project.sheets.some((sheet) => sheet.id === sheetId)) return project;
  const document = structuredClone(template.document);
  return {
    ...project,
    revision: project.revision + 1,
    sheets: project.sheets.map((sheet) => sheet.id === sheetId ? { ...sheet, name: template.name, kind: "free-schematic", document } : sheet),
    ...(project.continuations && { continuations: project.continuations.filter((continuation) => continuation.points.every((point) => point.sheetId !== sheetId)) }),
  };
}

function blankDocument(id: string, name: string): CircuitDocument {
  return { id, name, description: "Free-form electrical schematic sheet.", components: [], wires: [], revision: 1 };
}

