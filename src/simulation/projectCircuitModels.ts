import type { CircuitModelRun } from "./circuitModels";
import { executeCircuitModels } from "./circuitModels";
import type { CircuitDocument, ElectricalComponentDefinition, ElectricalProject, Wire } from "../types/electrical";

export type ProjectCircuitModelRun = CircuitModelRun & { sheetId: string };
type ProjectCircuitDocument = { document: CircuitDocument; componentOrigins: Map<string, { sheetId: string; componentId: string }> };

function projectRuntimeId(project: ElectricalProject): string {
  return project.sheets.length === 1 && project.sheets[0].kind === "reference-dol"
    ? project.sheets[0].document.id
    : `project-runtime::${project.id}`;
}

function assembleProjectCircuitDocument(project: ElectricalProject, runtimeSheetId?: string, runtimeDocument?: CircuitDocument | null): ProjectCircuitDocument {
  const componentOrigins = new Map<string, { sheetId: string; componentId: string }>();
  const components = project.sheets.flatMap((sheet) => {
    const document = sheet.id === runtimeSheetId && runtimeDocument ? runtimeDocument : sheet.document;
    return document.components.map((component) => {
      const id = `${sheet.id}::${component.id}`;
      componentOrigins.set(id, { sheetId: sheet.id, componentId: component.id });
      return { ...component, id };
    });
  });
  const wires: Wire[] = project.sheets.flatMap((sheet) => {
    const document = sheet.id === runtimeSheetId && runtimeDocument ? runtimeDocument : sheet.document;
    return document.wires.map((wire) => ({
      ...wire,
      id: `${sheet.id}::${wire.id}`,
      from: { ...wire.from, componentId: `${sheet.id}::${wire.from.componentId}` },
      to: { ...wire.to, componentId: `${sheet.id}::${wire.to.componentId}` },
      points: wire.points.map((point) => ({ ...point })),
    }));
  });
  for (const continuation of project.continuations ?? []) {
    const [source, ...destinations] = continuation.points;
    if (!source) continue;
    destinations.forEach((destination, index) => wires.push({
      id: `continuation::${continuation.id}::${index}`,
      from: { ...source.endpoint, componentId: `${source.sheetId}::${source.endpoint.componentId}` },
      to: { ...destination.endpoint, componentId: `${destination.sheetId}::${destination.endpoint.componentId}` },
      points: [],
      netName: continuation.label,
      draftingColor: continuation.conductorColor,
    }));
  }

  const document: CircuitDocument = {
    id: projectRuntimeId(project),
    name: project.name,
    description: project.description,
    components,
    wires,
    revision: project.revision,
  };
  return { document, componentOrigins };
}

/** Build one runtime network with stable sheet-prefixed component and wire IDs. */
export function createProjectRuntimeDocument(project: ElectricalProject): CircuitDocument {
  return assembleProjectCircuitDocument(project).document;
}

/** Execute a workbook as one electrical network while retaining each result's sheet identity. */
export function executeProjectCircuitModels(
  project: ElectricalProject,
  catalog: Map<string, ElectricalComponentDefinition>,
  runtimeSheetId?: string,
  runtimeDocument?: CircuitDocument | null,
): ProjectCircuitModelRun[] {
  const assembled = assembleProjectCircuitDocument(project, runtimeSheetId, runtimeSheetId ? runtimeDocument : null);
  const isProjectRuntime = !runtimeSheetId && runtimeDocument?.id === projectRuntimeId(project);
  const document = isProjectRuntime ? runtimeDocument! : assembled.document;
  const componentOrigins = isProjectRuntime
    ? new Map(project.sheets.flatMap((sheet) => sheet.document.components.map((component) => [
      `${sheet.id}::${component.id}`,
      { sheetId: sheet.id, componentId: component.id },
    ] as const)))
    : assembled.componentOrigins;
  return executeCircuitModels(document, catalog).flatMap((run) => {
    const origin = componentOrigins.get(run.componentId);
    return origin ? [{ ...run, ...origin }] : [];
  });
}
