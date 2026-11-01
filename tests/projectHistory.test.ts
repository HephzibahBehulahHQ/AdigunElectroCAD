import { describe, expect, it } from "vitest";
import { recordProjectEdit, redoProject, undoProject, type ProjectHistory } from "../src/cad/projectHistory";
import { createStarterProject } from "../src/projects/starterProject";

describe("project history", () => {
  it("undoes and redoes an edit while a new edit clears the redo branch", () => {
    const original = createStarterProject();
    const changed = { ...original, name: "Changed" };
    const replacement = { ...original, name: "Replacement" };
    const history: ProjectHistory = recordProjectEdit({ undo: [], redo: [] }, original);
    const undone = undoProject(history, changed);
    expect(undone.project?.name).toBe(original.name);
    const redone = redoProject(undone.history, original);
    expect(redone.project?.name).toBe("Changed");
    const branched = recordProjectEdit(undone.history, original);
    expect(branched).toEqual({ undo: [original], redo: [] });
    expect(redoProject(branched, replacement).project).toBeUndefined();
  });
});
