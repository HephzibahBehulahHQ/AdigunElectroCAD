import type { ElectricalProject, ProjectContinuation } from "../types/electrical";

export interface RemoveProjectSheetResult {
  project: ElectricalProject;
  removed: boolean;
  removedContinuations: number;
  removedSourceContinuations: number;
}

/** Move a sheet tab without changing continuation point order or source identity. */
export function reorderProjectSheet(project: ElectricalProject, sheetId: string, targetSheetId: string): ElectricalProject {
  const fromIndex = project.sheets.findIndex((sheet) => sheet.id === sheetId);
  const toIndex = project.sheets.findIndex((sheet) => sheet.id === targetSheetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return project;
  const sheets = [...project.sheets];
  const [sheet] = sheets.splice(fromIndex, 1);
  sheets.splice(toIndex, 0, sheet);
  return { ...project, revision: project.revision + 1, sheets };
}

/**
 * Remove a sheet from the project. Nets whose original source is removed are
 * dropped; other nets retain their source and surviving ordered points.
 */
export function removeProjectSheet(project: ElectricalProject, sheetId: string): RemoveProjectSheetResult {
  if (project.sheets.length <= 1 || !project.sheets.some((sheet) => sheet.id === sheetId)) {
    return { project, removed: false, removedContinuations: 0, removedSourceContinuations: 0 };
  }
  let removedContinuations = 0;
  let removedSourceContinuations = 0;
  const continuations: ProjectContinuation[] = (project.continuations ?? []).flatMap((continuation) => {
    if (continuation.points[0]?.sheetId === sheetId) {
      removedContinuations++;
      removedSourceContinuations++;
      return [];
    }
    const points = continuation.points.filter((point) => point.sheetId !== sheetId);
    if (points.length < 2) {
      removedContinuations++;
      return [];
    }
    return [{
      ...continuation,
      points: points.map((point, index) => ({
        ...point,
        role: index === 0 ? "source" as const : index === points.length - 1 ? "destination" as const : "continuation" as const,
      })),
    }];
  });
  return {
    project: {
      ...project,
      revision: project.revision + 1,
      sheets: project.sheets.filter((sheet) => sheet.id !== sheetId),
      ...(project.continuations ? { continuations } : {}),
    },
    removed: true,
    removedContinuations,
    removedSourceContinuations,
  };
}
