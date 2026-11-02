import { expect, it } from "vitest";
import { readCloudProjectSelection, rememberCloudProjectSelection, selectedCloudProjectId } from "../src/services/cloudProjectSelection";

const storage = () => {
  const records = new Map<string, string>();
  return { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
};

it("keeps two accounts' cloud project selections independent across reloads", () => {
  const store = storage();
  rememberCloudProjectSelection(store, { userId: "account-a", projectId: "project-a" });
  expect(readCloudProjectSelection(store, "account-b")?.projectId).toBe("");
  rememberCloudProjectSelection(store, { userId: "account-b", projectId: "project-b" });
  expect(readCloudProjectSelection(store, "account-a")?.projectId).toBe("project-a");
  expect(readCloudProjectSelection(store, "account-b")?.projectId).toBe("project-b");
});

it("does not reuse a stale selection while the active account changes", () => {
  const selection = { userId: "account-a", projectId: "project-a" };
  expect(selectedCloudProjectId(selection, "account-a")).toBe("project-a");
  expect(selectedCloudProjectId(selection, "account-b")).toBe("");
  expect(selectedCloudProjectId(selection, null)).toBe("");
});

it("ignores the old unscoped project id rather than assigning it to an unknown owner", () => {
  const store = storage();
  store.setItem("adigun-electro-cad.cloud-project-id.v1", "other-account-project");
  expect(readCloudProjectSelection(store, "account-a")?.projectId).toBe("");
});

it("retains a safe in-memory selection when browser storage is unavailable", () => {
  const store = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  expect(readCloudProjectSelection(store, "account-a")).toEqual({ userId: "account-a", projectId: "" });
  expect(rememberCloudProjectSelection(store, { userId: "account-a", projectId: "project-a" })).toBe(false);
});
