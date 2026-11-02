export interface WindowRect { x: number; y: number; width: number; height: number; }
export interface BotWindowLayout { version: 1; rect: WindowRect; open: boolean; mode: "normal" | "minimized" | "maximized"; restoreMode: "normal" | "maximized"; updatedAt: number; }
export interface Viewport { width: number; height: number; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
// An edit must advance the revision even when the wall clock repeats or moves back.
const nextRevision = (layout: BotWindowLayout, now: number) => Math.max(now, layout.updatedAt + 1);
export const botWindowStorageKey = (owner: string) => `adigun-electro-cad.bot-window.v1.${encodeURIComponent(owner)}`;
export function defaultBotWindow(viewport: Viewport): BotWindowLayout {
  return { version: 1, rect: fitWindow({ x: viewport.width - 460, y: 80, width: 420, height: 580 }, viewport), open: false, mode: "normal", restoreMode: "normal", updatedAt: 0 };
}
export function fitWindow(rect: WindowRect, viewport: Viewport): WindowRect {
  const maxWidth = Math.max(1, Math.min(900, viewport.width - 16)), maxHeight = Math.max(1, Math.min(800, viewport.height - 16));
  const width = clamp(rect.width, Math.min(320, maxWidth), maxWidth), height = clamp(rect.height, Math.min(400, maxHeight), maxHeight);
  return { x: clamp(rect.x, 8, Math.max(8, viewport.width - width - 8)), y: clamp(rect.y, 8, Math.max(8, viewport.height - height - 8)), width, height };
}
export function displayedWindow(layout: BotWindowLayout, viewport: Viewport): WindowRect {
  const mobile = viewport.width <= 600;
  if (mobile && layout.mode !== "minimized") return { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const maximized = layout.mode === "maximized";
  const rect = maximized ? { x: 16, y: 16, width: Math.max(1, viewport.width - 32), height: Math.max(1, viewport.height - 32) } : fitWindow(layout.rect, viewport);
  return layout.mode === "minimized" ? { ...rect, y: clamp(layout.rect.y, 8, Math.max(8, viewport.height - 64)), height: 56 } : rect;
}
export function moveBotWindow(layout: BotWindowLayout, viewport: Viewport, dx: number, dy: number, now: number): BotWindowLayout {
  if (layout.mode === "maximized" || viewport.width <= 600) return layout;
  now = nextRevision(layout, now);
  const rect = fitWindow(layout.rect, viewport);
  if (layout.mode === "minimized") return { ...layout, rect: { ...rect, x: clamp(rect.x + dx, 8, Math.max(8, viewport.width - rect.width - 8)), y: clamp(layout.rect.y + dy, 8, Math.max(8, viewport.height - 64)) }, updatedAt: now };
  return { ...layout, rect: fitWindow({ ...rect, x: rect.x + dx, y: rect.y + dy }, viewport), updatedAt: now };
}
export function resizeBotWindow(layout: BotWindowLayout, viewport: Viewport, dx: number, dy: number, now: number): BotWindowLayout {
  if (layout.mode !== "normal" || viewport.width <= 600) return layout;
  now = nextRevision(layout, now);
  const rect = fitWindow(layout.rect, viewport);
  return { ...layout, rect: { ...rect, width: clamp(rect.width + dx, Math.min(320, viewport.width - 16), Math.min(900, viewport.width - rect.x - 8)), height: clamp(rect.height + dy, Math.min(400, viewport.height - 16), Math.min(800, viewport.height - rect.y - 8)) }, updatedAt: now };
}
export function botWindowAction(layout: BotWindowLayout, action: "open" | "close" | "minimize" | "maximize" | "restore", now: number): BotWindowLayout {
  now = nextRevision(layout, now);
  if (action === "close") return { ...layout, open: false, updatedAt: now };
  if (action === "open") return { ...layout, open: true, mode: layout.mode === "minimized" ? layout.restoreMode : layout.mode, updatedAt: now };
  if (action === "minimize") return { ...layout, mode: "minimized", restoreMode: layout.mode === "maximized" ? "maximized" : "normal", updatedAt: now };
  if (action === "maximize") return { ...layout, mode: "maximized", updatedAt: now };
  return { ...layout, mode: layout.mode === "minimized" ? layout.restoreMode : "normal", updatedAt: now };
}
export function parseBotWindow(value: unknown): BotWindowLayout | null {
  if (!value || typeof value !== "object") return null;
  const layout = value as BotWindowLayout, rect = layout.rect;
  if (layout.version !== 1 || !rect || typeof layout.open !== "boolean" || !["normal", "minimized", "maximized"].includes(layout.mode) || !["normal", "maximized"].includes(layout.restoreMode) || !Number.isFinite(layout.updatedAt) || layout.updatedAt < 0 || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
  return { version: 1, rect: { ...rect }, open: layout.open, mode: layout.mode, restoreMode: layout.restoreMode, updatedAt: layout.updatedAt };
}
export function readBotWindow(storage: Pick<Storage, "getItem">, owner: string, viewport: Viewport): BotWindowLayout {
  try { return parseBotWindow(JSON.parse(storage.getItem(botWindowStorageKey(owner)) ?? "null")) ?? defaultBotWindow(viewport); } catch { return defaultBotWindow(viewport); }
}
export function saveBotWindow(storage: Pick<Storage, "setItem">, owner: string, layout: BotWindowLayout): boolean {
  try { storage.setItem(botWindowStorageKey(owner), JSON.stringify(layout)); return true; } catch { return false; }
}
