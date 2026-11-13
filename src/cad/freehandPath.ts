import type { SchematicGraphicPoint } from "../types/electrical";

export const MAX_FREEHAND_POINTS = 1200;

/** Keep freehand paths inside the sheet and limit dense pointer samples. */
export function appendFreehandPoint(points: readonly SchematicGraphicPoint[], point: SchematicGraphicPoint): SchematicGraphicPoint[] {
  const next = { x: Math.max(0, Math.min(1100, point.x)), y: Math.max(0, Math.min(780, point.y)) };
  const last = points.at(-1);
  if (last && Math.hypot(next.x - last.x, next.y - last.y) < 4) return [...points];
  if (points.length < MAX_FREEHAND_POINTS) return [...points, next];
  return [...points.slice(0, -1), next];
}

export function freehandPathBounds(points: readonly SchematicGraphicPoint[]) {
  if (points.length < 2) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}
