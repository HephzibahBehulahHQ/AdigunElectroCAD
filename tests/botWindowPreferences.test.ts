import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ schema: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), like: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn() }));
vi.mock("../src/services/supabase", () => ({ supabaseClient: () => ({ schema: mock.schema }) }));
import { defaultBotWindow } from "../src/copilot/windowLayout";
import { loadAccountBotWindow, saveAccountBotWindow } from "../src/services/botWindowPreferences";
const prefix = "ADIGUN_ELECTROCAD_BOT_WINDOW_V1:";
const layout = defaultBotWindow({ width: 1440, height: 900 });
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of ["schema", "from", "select", "eq", "like", "order", "limit", "insert", "update"] as const) mock[method].mockReturnValue(mock);
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
  mock.single.mockResolvedValue({ data: { id: 7 }, error: null });
});
it("loads only the named user's namespaced layout in this product schema", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { id: 7, content: prefix + JSON.stringify(layout) }, error: null });
  expect(await loadAccountBotWindow("user-a")).toEqual(layout);
  expect(mock.schema).toHaveBeenCalledWith("adigunelectrocad");
  expect(mock.from).toHaveBeenCalledWith("my_data");
  expect(mock.eq).toHaveBeenCalledWith("user_id", "user-a");
  expect(mock.like).toHaveBeenCalledWith("content", "ADIGUN\\_ELECTROCAD\\_BOT\\_WINDOW\\_V1:%");
});
it("inserts a missing owned layout without writing another preference type", async () => {
  await saveAccountBotWindow("user-a", layout);
  expect(mock.insert).toHaveBeenCalledWith({ user_id: "user-a", content: prefix + JSON.stringify(layout) });
  expect(mock.update).not.toHaveBeenCalled();
});
it("updates the owned namespaced row without changing ownership or other data", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { id: 7, content: prefix + JSON.stringify(layout) }, error: null });
  await saveAccountBotWindow("user-a", { ...layout, open: true });
  expect(mock.update).toHaveBeenCalledWith({ content: prefix + JSON.stringify({ ...layout, open: true }) });
  expect(mock.eq).toHaveBeenCalledWith("id", 7);
  expect(mock.eq.mock.calls.filter((call) => call[0] === "user_id")).toEqual([["user_id", "user-a"], ["user_id", "user-a"]]);
});
it("does not overwrite an unrelated returned row", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { id: 7, content: "other user content" }, error: null });
  await expect(saveAccountBotWindow("user-a", layout)).rejects.toThrow("not a Bot layout");
  expect(mock.update).not.toHaveBeenCalled();
});
it("returns no layout for corrupt namespaced content and propagates server errors", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { id: 7, content: prefix + "broken" }, error: null });
  expect(await loadAccountBotWindow("user-a")).toBeNull();
  mock.maybeSingle.mockResolvedValue({ data: null, error: new Error("denied") });
  await expect(loadAccountBotWindow("user-a")).rejects.toThrow("denied");
});
it("rejects unsafe row IDs and unsuccessful writes", async () => {
  mock.maybeSingle.mockResolvedValue({ data: { id: Number.MAX_SAFE_INTEGER + 1, content: prefix + "{}" }, error: null });
  await expect(saveAccountBotWindow("user-a", layout)).rejects.toThrow("numeric range");
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
  mock.single.mockResolvedValue({ data: null, error: null });
  await expect(saveAccountBotWindow("user-a", layout)).rejects.toThrow("could not be saved");
});
