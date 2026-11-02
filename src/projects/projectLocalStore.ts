import type { ElectricalProject } from "../types/electrical";
import { parseProjectJson } from "./projectSerialization";

type ProjectStorage = Pick<Storage, "getItem" | "setItem">;

export function readLocalProject(storage: ProjectStorage, key: string): { project: ElectricalProject; source: "current" | "previous" } | null {
  const current = storage.getItem(key);
  if (current !== null) {
    try { return { project: parseProjectJson(current), source: "current" }; } catch { /* Try the retained save without changing either record. */ }
  }
  const previous = storage.getItem(`${key}.previous`);
  if (previous !== null) return { project: parseProjectJson(previous), source: "previous" };
  if (current !== null) throw new Error("The current local save is invalid and no previous save is available.");
  return null;
}

export function writeLocalProject(storage: ProjectStorage, key: string, project: ElectricalProject): void {
  const serialized = JSON.stringify(project);
  parseProjectJson(serialized);
  const current = storage.getItem(key);
  if (current === serialized) return;
  if (current !== null) {
    let valid = true;
    try { parseProjectJson(current); } catch { valid = false; }
    storage.setItem(`${key}.${valid ? "previous" : "rejected"}`, current);
  }
  storage.setItem(key, serialized);
}
