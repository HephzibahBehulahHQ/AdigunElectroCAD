import { expect, it } from "vitest";
import { botWindowAction, defaultBotWindow, displayedWindow, fitWindow, moveBotWindow, parseBotWindow, readBotWindow, resizeBotWindow, saveBotWindow } from "../src/copilot/windowLayout";
const desktop = { width: 1440, height: 1000 };
const storage = () => { const rows = new Map<string, string>(); return { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => { rows.set(key, value); } }; };

it("advances every local edit revision during repeated or rolled-back clock readings", () => {
  let layout = botWindowAction(defaultBotWindow(desktop), "open", 100);
  const pendingCloudVersion = layout.updatedAt;
  layout = botWindowAction(layout, "close", 100);
  // The pending cloud-load guard must detect this edit even in the same millisecond.
  expect(layout.updatedAt).toBeGreaterThan(pendingCloudVersion);
  for (const action of ["open", "minimize", "restore", "maximize", "restore"] as const) {
    const previous = layout.updatedAt;
    layout = botWindowAction(layout, action, 50);
    expect(layout.updatedAt).toBeGreaterThan(previous);
  }
  const beforeMove = layout.updatedAt;
  layout = moveBotWindow(layout, desktop, -20, 20, 50);
  expect(layout.updatedAt).toBeGreaterThan(beforeMove);
  const beforeResize = layout.updatedAt;
  layout = resizeBotWindow(layout, desktop, 20, 20, 50);
  expect(layout.updatedAt).toBeGreaterThan(beforeResize);
});

it("restores a moved and resized open window from per-user storage", () => {
  const store = storage();
  let layout = botWindowAction(defaultBotWindow(desktop), "open", 1);
  layout = moveBotWindow(layout, desktop, -400, 50, 2);
  layout = resizeBotWindow(layout, desktop, 160, 120, 3);
  expect(saveBotWindow(store, "user-a", layout)).toBe(true);
  expect(readBotWindow(store, "user-a", desktop)).toEqual(layout);
  expect(readBotWindow(store, "user-b", desktop).open).toBe(false);
  expect(readBotWindow(store, "guest", desktop).open).toBe(false);
});

it("maximizes without destroying normal geometry and restores it exactly", () => {
  const initial = botWindowAction(defaultBotWindow(desktop), "open", 1);
  const maximized = botWindowAction(initial, "maximize", 2);
  expect(displayedWindow(maximized, desktop)).toEqual({ x: 16, y: 16, width: 1408, height: 968 });
  expect(botWindowAction(maximized, "restore", 3).rect).toEqual(initial.rect);
  expect(displayedWindow(botWindowAction(maximized, "restore", 3), desktop)).toEqual(initial.rect);
});

it("minimizes to a title bar and restores the previous maximized mode", () => {
  const store = storage();
  const initial = botWindowAction(botWindowAction(defaultBotWindow(desktop), "open", 1), "maximize", 2);
  const minimized = botWindowAction(initial, "minimize", 3);
  expect(displayedWindow(minimized, desktop).height).toBe(56);
  saveBotWindow(store, "guest", minimized);
  const loaded = readBotWindow(store, "guest", desktop);
  expect(loaded.mode).toBe("minimized");
  expect(botWindowAction(loaded, "restore", 4).mode).toBe("maximized");
  expect(botWindowAction(loaded, "open", 4).mode).toBe("maximized");
});

it("keeps a closed window closed after reload and reopens its last rectangle", () => {
  const store = storage();
  const moved = moveBotWindow(botWindowAction(defaultBotWindow(desktop), "open", 1), desktop, -200, 80, 2);
  saveBotWindow(store, "guest", botWindowAction(moved, "close", 3));
  const loaded = readBotWindow(store, "guest", desktop);
  expect(loaded.open).toBe(false);
  expect(botWindowAction(loaded, "open", 4).rect).toEqual(moved.rect);
});

it("constrains extreme drag and resize requests to visible desktop bounds", () => {
  let layout = moveBotWindow(defaultBotWindow(desktop), desktop, -10000, -10000, 1);
  expect(layout.rect.x).toBe(8); expect(layout.rect.y).toBe(8);
  layout = resizeBotWindow(layout, desktop, 10000, 10000, 2);
  expect(layout.rect.width).toBe(900); expect(layout.rect.height).toBe(800);
  layout = moveBotWindow(layout, desktop, 10000, 10000, 3);
  expect(layout.rect.x + layout.rect.width).toBeLessThanOrEqual(desktop.width - 8);
  expect(layout.rect.y + layout.rect.height).toBeLessThanOrEqual(desktop.height - 8);
  layout = resizeBotWindow(layout, desktop, -10000, -10000, 4);
  expect(layout.rect.width).toBe(320); expect(layout.rect.height).toBe(400);
});

it("lets the minimized title bar reach the bottom while remaining grabbable", () => {
  const minimized = botWindowAction(defaultBotWindow(desktop), "minimize", 1);
  const moved = moveBotWindow(minimized, desktop, 0, 10000, 2);
  const rect = displayedWindow(moved, desktop);
  expect(rect.y + rect.height).toBe(desktop.height - 8);
});

it("fits saved geometry to a smaller viewport without overwriting its normal rectangle", () => {
  const layout = defaultBotWindow(desktop), before = structuredClone(layout);
  const fitted = fitWindow(layout.rect, { width: 700, height: 500 });
  expect(fitted.x + fitted.width).toBeLessThanOrEqual(692);
  expect(fitted.y + fitted.height).toBeLessThanOrEqual(492);
  expect(layout).toEqual(before);
});

it("uses a full mobile surface and ignores drag/resize while preserving desktop geometry", () => {
  const mobile = { width: 390, height: 844 }, layout = defaultBotWindow(desktop);
  expect(displayedWindow(layout, mobile)).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  expect(moveBotWindow(layout, mobile, 100, 100, 1)).toBe(layout);
  expect(resizeBotWindow(layout, mobile, 100, 100, 1)).toBe(layout);
});

it.each([null, {}, { version: 2 }, { ...defaultBotWindow(desktop), rect: { x: NaN, y: 0, width: 400, height: 500 } }, { ...defaultBotWindow(desktop), mode: "unknown" }])("rejects malformed persisted layout", (value) => {
  expect(parseBotWindow(value)).toBeNull();
});

it("keeps the default usable when storage access fails", () => {
  const denied = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  expect(readBotWindow(denied, "guest", desktop)).toEqual(defaultBotWindow(desktop));
  expect(saveBotWindow(denied, "guest", defaultBotWindow(desktop))).toBe(false);
});
