import { createDolMotorStarter } from "./dolMotorStarter";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitDocument, CircuitSheet, ElectricalProject } from "../types/electrical";

export const createStarterProject = (): ElectricalProject => ({
  id: "reference-dol-project",
  name: "DOL Motor Starter — 7.5 kW",
  description: "Editable direct-on-line motor starter project with a reference circuit and additional free schematic sheets.",
  revision: 1,
  sheets: [{ id: "sheet-dol", name: "Power & Control Circuit", kind: "reference-dol", document: createDolMotorStarter() }],
});

export function addFreeSchematicSheet(project: ElectricalProject): ElectricalProject {
  const ordinal = project.sheets.filter((sheet) => sheet.kind === "free-schematic").length + 1;
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
