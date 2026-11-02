import { expect, it } from "vitest";
import { bindProjectExitSave, type PendingLocalProject } from "../src/projects/projectExitSave";
import { readLocalProject, writeLocalProject } from "../src/projects/projectLocalStore";
import { createStarterProject } from "../src/projects/starterProject";

function storage() {
  const records = new Map<string, string>();
  return { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
}

it("flushes the latest pending edit before the debounce and retains the previous valid save", () => {
  const events = new EventTarget(), store = storage(), original = createStarterProject();
  writeLocalProject(store, "project", original);
  let pending: PendingLocalProject = { project: original, dirty: false, botEditsUnsaved: false };
  const release = bindProjectExitSave(events, () => pending, (project) => writeLocalProject(store, "project", project));
  pending = { ...pending, project: { ...original, name: "Newest pending edit" }, dirty: true };
  events.dispatchEvent(new Event("pagehide"));
  expect(readLocalProject(store, "project")?.project.name).toBe("Newest pending edit");
  expect(JSON.parse(store.getItem("project.previous")!)).toEqual(original);
  release();
});

it("saves an immediate Undo result instead of the previously saved edit", () => {
  const events = new EventTarget(), store = storage(), original = createStarterProject();
  writeLocalProject(store, "project", { ...original, name: "Edit to undo" });
  bindProjectExitSave(events, () => ({ project: original, dirty: true, botEditsUnsaved: false }), (project) => writeLocalProject(store, "project", project));
  events.dispatchEvent(new Event("pagehide"));
  expect(readLocalProject(store, "project")?.project).toEqual(original);
});

it("does not persist Bot edits or a clean/imported design on exit", () => {
  const events = new EventTarget(), original = createStarterProject();
  const saved: string[] = [];
  let pending: PendingLocalProject = { project: original, dirty: true, botEditsUnsaved: true };
  bindProjectExitSave(events, () => pending, (project) => saved.push(project.name));
  events.dispatchEvent(new Event("pagehide"));
  pending = { ...pending, dirty: false, botEditsUnsaved: false };
  events.dispatchEvent(new Event("pagehide"));
  expect(saved).toEqual([]);
  pending = { ...pending, dirty: true };
  events.dispatchEvent(new Event("pagehide"));
  expect(saved).toEqual([original.name]);
});

it("retains the stored project when exit-time storage is unavailable", () => {
  const events = new EventTarget(), store = storage(), original = createStarterProject();
  writeLocalProject(store, "project", original);
  const blocked = { getItem: store.getItem, setItem: () => { throw new Error("quota"); } };
  bindProjectExitSave(events, () => ({ project: { ...original, name: "Unsaved" }, dirty: true, botEditsUnsaved: false }), (project) => writeLocalProject(blocked, "project", project));
  expect(() => events.dispatchEvent(new Event("pagehide"))).not.toThrow();
  expect(readLocalProject(store, "project")?.project).toEqual(original);
});

it("removes its exit listener when the application releases it", () => {
  const events = new EventTarget(), original = createStarterProject();
  let writes = 0;
  const release = bindProjectExitSave(events, () => ({ project: original, dirty: true, botEditsUnsaved: false }), () => { writes++; });
  release();
  events.dispatchEvent(new Event("pagehide"));
  expect(writes).toBe(0);
});
