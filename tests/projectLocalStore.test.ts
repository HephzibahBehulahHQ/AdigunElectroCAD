import { expect, it } from "vitest";
import { readLocalProject, writeLocalProject } from "../src/projects/projectLocalStore";
import { createStarterProject } from "../src/projects/starterProject";

function storage() {
  const records = new Map<string, string>();
  return { records, getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
}

it("retains the previous valid save and recovers it when the current save is damaged", () => {
  const store = storage(); const first = createStarterProject();
  writeLocalProject(store, "project", first);
  writeLocalProject(store, "project", { ...first, name: "Second save" });
  expect(readLocalProject(store, "project")?.project.name).toBe("Second save");
  store.setItem("project", "damaged-json");
  expect(readLocalProject(store, "project")).toEqual({ project: first, source: "previous" });
  expect(store.getItem("project")).toBe("damaged-json");
});

it("archives an invalid current save without overwriting the valid recovery copy", () => {
  const store = storage(); const project = createStarterProject();
  store.setItem("project.previous", JSON.stringify(project));
  store.setItem("project", "damaged-json");
  writeLocalProject(store, "project", { ...project, name: "Recovered work" });
  expect(store.getItem("project.rejected")).toBe("damaged-json");
  expect(JSON.parse(store.getItem("project.previous")!).name).toBe(project.name);
  expect(readLocalProject(store, "project")?.project.name).toBe("Recovered work");
});

it("leaves the current save intact when writing the replacement fails", () => {
  const store = storage(); const project = createStarterProject();
  writeLocalProject(store, "project", project);
  const failing = { getItem: store.getItem, setItem: (key: string, value: string) => { if (key === "project") throw new Error("quota"); store.setItem(key, value); } };
  expect(() => writeLocalProject(failing, "project", { ...project, name: "Unsaved" })).toThrow("quota");
  expect(readLocalProject(store, "project")?.project).toEqual(project);
});

it("rejects invalid project state before replacing any stored record", () => {
  const store = storage(); const project = createStarterProject();
  writeLocalProject(store, "project", project);
  const before = [...store.records];
  const invalid = { ...project, sheets: [project.sheets[0], project.sheets[0]] };
  expect(() => writeLocalProject(store, "project", invalid)).toThrow("unique sheet id");
  expect([...store.records]).toEqual(before);
});

it("reports no save or an unrecoverable invalid save without deleting records", () => {
  const store = storage();
  expect(readLocalProject(store, "project")).toBeNull();
  store.setItem("project", "bad");
  expect(() => readLocalProject(store, "project")).toThrow("no previous save");
  expect(store.getItem("project")).toBe("bad");
});
