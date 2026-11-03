import type { ElectricalProject } from "../types/electrical";

export interface PendingLocalProject {
  project: ElectricalProject;
  dirty: boolean;
  botEditsUnsaved: boolean;
}

/** Flush the latest eligible design before normal exit without auto-saving accepted Bot edits. */
export function bindProjectExitSave(events: Pick<EventTarget, "addEventListener" | "removeEventListener">, read: () => PendingLocalProject, save: (project: ElectricalProject) => void): () => void {
  const flush = () => {
    try {
      const pending = read();
      if (pending.dirty && !pending.botEditsUnsaved) save(pending.project);
    } catch {
      // Exit cannot guarantee storage availability; retain the previous valid save.
    }
  };
  events.addEventListener("pagehide", flush);
  return () => events.removeEventListener("pagehide", flush);
}
