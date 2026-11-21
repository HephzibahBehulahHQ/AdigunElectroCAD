import type { SchematicGraphic } from "../types/electrical";

export function setSchematicGraphicBounds(graphic: SchematicGraphic, bounds: Pick<SchematicGraphic, "x1" | "y1" | "x2" | "y2">): SchematicGraphic | null {
  if (graphic.points || !Object.values(bounds).every(Number.isFinite)) return null;
  const { x1, y1, x2, y2 } = bounds;
  const span = graphic.kind === "line" ? Math.hypot(x2 - x1, y2 - y1) : Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));
  return span >= 4 ? { ...graphic, x1, y1, x2, y2 } : null;
}

export function duplicateSchematicGraphic(graphic: SchematicGraphic, id: string, offset = 20): SchematicGraphic {
  return {
    ...graphic,
    id,
    name: `${graphic.name} copy`.slice(0, 80),
    x1: graphic.x1 + offset,
    y1: graphic.y1 + offset,
    x2: graphic.x2 + offset,
    y2: graphic.y2 + offset,
    ...(graphic.points ? { points: graphic.points.map((point) => ({ x: point.x + offset, y: point.y + offset })) } : {}),
  };
}


export type GraphicStackOrder = "backward" | "forward" | "back" | "front";
export type GraphicStackCapabilities = Record<GraphicStackOrder, boolean>;

export function canReorderSchematicGraphics(graphics: readonly { id: string }[], ids: string | string[]): GraphicStackCapabilities {
  const selected = new Set(typeof ids === "string" ? [ids] : ids);
  const flags = graphics.map((graphic) => selected.has(graphic.id));
  const hasSelection = flags.some(Boolean);
  return {
    back: hasSelection && flags.some((flag, index) => flag && flags.slice(0, index).some((previous) => !previous)),
    front: hasSelection && flags.some((flag, index) => flag && flags.slice(index + 1).some((following) => !following)),
    backward: flags.some((flag, index) => index > 0 && flag && !flags[index - 1]),
    forward: flags.some((flag, index) => index < flags.length - 1 && flag && !flags[index + 1]),
  };
}

export function reorderSchematicGraphic<T extends { id: string }>(graphics: T[], ids: string | string[], order: GraphicStackOrder): T[] {
  const selected = new Set(typeof ids === "string" ? [ids] : ids);
  const flags = graphics.map((graphic) => selected.has(graphic.id));
  const capabilities = canReorderSchematicGraphics(graphics, ids);
  if (!capabilities[order]) return graphics;
  if (order === "back") return [...graphics.filter((_, index) => flags[index]), ...graphics.filter((_, index) => !flags[index])];
  if (order === "front") return [...graphics.filter((_, index) => !flags[index]), ...graphics.filter((_, index) => flags[index])];
  const next = [...graphics];
  if (order === "forward") {
    for (let index = next.length - 2; index >= 0; index--) {
      if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
  } else {
    for (let index = 1; index < next.length; index++) {
      if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) [next[index], next[index - 1]] = [next[index - 1], next[index]];
    }
  }
  return next;
}
