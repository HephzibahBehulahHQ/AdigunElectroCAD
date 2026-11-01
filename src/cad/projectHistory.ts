import type { ElectricalProject } from "../types/electrical";

export interface ProjectHistory {
  undo: ElectricalProject[];
  redo: ElectricalProject[];
}

const bounded = (projects: ElectricalProject[]) => projects.slice(-30);

export function recordProjectEdit(history: ProjectHistory, current: ElectricalProject): ProjectHistory {
  return { undo: bounded([...history.undo, current]), redo: [] };
}

export function undoProject(history: ProjectHistory, current: ElectricalProject): { project?: ElectricalProject; history: ProjectHistory } {
  const project = history.undo.at(-1);
  if (!project) return { history };
  return { project, history: { undo: history.undo.slice(0, -1), redo: bounded([...history.redo, current]) } };
}

export function redoProject(history: ProjectHistory, current: ElectricalProject): { project?: ElectricalProject; history: ProjectHistory } {
  const project = history.redo.at(-1);
  if (!project) return { history };
  return { project, history: { undo: bounded([...history.undo, current]), redo: history.redo.slice(0, -1) } };
}
