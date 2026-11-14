import type { SchematicGraphic } from "../types/electrical";

export function setSchematicGraphicBounds(graphic: SchematicGraphic, bounds: Pick<SchematicGraphic, "x1" | "y1" | "x2" | "y2">): SchematicGraphic | null {
  if (graphic.points || !Object.values(bounds).every(Number.isFinite)) return null;
  const { x1, y1, x2, y2 } = bounds;
  if (x1 < 0 || x2 < 0 || x1 > 1100 || x2 > 1100 || y1 < 0 || y2 < 0 || y1 > 780 || y2 > 780) return null;
  const span = graphic.kind === "line" ? Math.hypot(x2 - x1, y2 - y1) : Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));
  return span >= 4 ? { ...graphic, x1, y1, x2, y2 } : null;
}

export function duplicateSchematicGraphic(graphic: SchematicGraphic, id: string, offset = 20): SchematicGraphic {
  const xs = graphic.points?.map((point) => point.x) ?? [graphic.x1, graphic.x2];
  const ys = graphic.points?.map((point) => point.y) ?? [graphic.y1, graphic.y2];
  const dx = chooseOffset(Math.min(...xs), Math.max(...xs), 1100, offset);
  const dy = chooseOffset(Math.min(...ys), Math.max(...ys), 780, offset);
  return {
    ...graphic,
    id,
    name: `${graphic.name} copy`.slice(0, 80),
    x1: graphic.x1 + dx,
    y1: graphic.y1 + dy,
    x2: graphic.x2 + dx,
    y2: graphic.y2 + dy,
    ...(graphic.points ? { points: graphic.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) } : {}),
  };
}

function chooseOffset(minimum: number, maximum: number, limit: number, offset: number) {
  if (maximum + offset <= limit) return offset;
  if (minimum - offset >= 0) return -offset;
  return 0;
}


export type GraphicStackOrder = "backward" | "forward" | "back" | "front";
export type GraphicStackCapabilities = Record<GraphicStackOrder, boolean>;

export function canReorderSchematicGraphics(graphics: SchematicGraphic[], ids: string | string[]): GraphicStackCapabilities {
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

export function reorderSchematicGraphic(graphics: SchematicGraphic[], ids: string | string[], order: GraphicStackOrder): SchematicGraphic[] {
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
