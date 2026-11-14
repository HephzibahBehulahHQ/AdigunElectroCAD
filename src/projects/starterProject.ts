import { createDolMotorStarter } from "./dolMotorStarter";
import { createTwoMotorSequence } from "./twoMotorSequence";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitDocument, CircuitSheet, ElectricalProject } from "../types/electrical";
import { MAX_PROJECT_SHEETS } from "./projectLimits";

export const createStarterProject = (): ElectricalProject => ({
  id: "reference-dol-project",
  name: "DOL Motor Starter — 7.5 kW",
  description: "Editable direct-on-line motor starter project with a reference circuit and additional free schematic sheets.",
  revision: 1,
  sheets: [{ id: "sheet-dol", name: "Power & Control Circuit", kind: "reference-dol", document: createDolMotorStarter() }],
});

export const createMotorStarterWorkbook = (): ElectricalProject => ({
  id: "motor-starter-workbook",
  name: "Motor starter workbook",
  description: "A connected two-motor sequence project alongside the DOL reference circuit. The two sheets are separate schematics; cross-sheet electrical nets are not modeled.",
  revision: 1,
  sheets: [
    { id: "sheet-dol", name: "DOL reference", kind: "reference-dol", document: createDolMotorStarter() },
    { id: "sheet-two-motor", name: "Two-motor sequence", kind: "free-schematic", document: createTwoMotorSequence() },
  ],
});

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
  const document: CircuitDocument = {
    ...template.document,
    components: template.document.components.map((component) => ({ ...component, properties: { ...component.properties } })),
    wires: template.document.wires.map((wire) => ({ ...wire, from: { ...wire.from }, to: { ...wire.to }, points: wire.points.map((point) => ({ ...point })) })),
  };
  return { ...project, revision: project.revision + 1, sheets: project.sheets.map((sheet) => sheet.id === sheetId ? { ...sheet, name: template.name, kind: "free-schematic", document } : sheet) };
}

function blankDocument(id: string, name: string): CircuitDocument {
  return { id, name, description: "Free-form electrical schematic sheet.", components: [], wires: [], revision: 1 };
}

