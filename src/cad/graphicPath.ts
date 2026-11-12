import type { SchematicGraphicPoint } from "../types/electrical";

export type GraphicPathKind = "polyline" | "polygon";

const polygonHasArea = (points: SchematicGraphicPoint[]) => Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point.x * next.y - next.x * point.y; }, 0)) >= 8;

export function graphicPathBounds(points: SchematicGraphicPoint[]) {
  const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

export function insertGraphicPathVertex(points: SchematicGraphicPoint[], kind: GraphicPathKind, x: number, y: number, tolerance = 28): SchematicGraphicPoint[] | null {
  const segmentCount = kind === "polygon" ? points.length : points.length - 1;
  let closest = { segment: -1, distance: Number.POSITIVE_INFINITY, x: 0, y: 0 };
  for (let index = 0; index < segmentCount; index += 1) {
    const from = points[index]; const to = points[(index + 1) % points.length];
    const dx = to.x - from.x; const dy = to.y - from.y;
    const ratio = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / (dx * dx + dy * dy || 1)));
    const projectedX = from.x + ratio * dx; const projectedY = from.y + ratio * dy;
    const distance = Math.hypot(x - projectedX, y - projectedY);
    if (distance < closest.distance) closest = { segment: index, distance, x: projectedX, y: projectedY };
  }
  if (closest.distance > tolerance) return null;
  const vertex = { x: Math.max(0, Math.min(1100, Math.round(closest.x / 20) * 20)), y: Math.max(0, Math.min(780, Math.round(closest.y / 20) * 20)) };
  const insertAt = closest.segment + 1;
  const previous = points[closest.segment]; const next = points[insertAt % points.length];
  if ((previous.x === vertex.x && previous.y === vertex.y) || (next.x === vertex.x && next.y === vertex.y)) return null;
  return [...points.slice(0, insertAt), vertex, ...points.slice(insertAt)];
}

export function deleteGraphicPathVertex(points: SchematicGraphicPoint[], kind: GraphicPathKind, index: number): SchematicGraphicPoint[] | null {
  const minimum = kind === "polygon" ? 3 : 2;
  if (points.length <= minimum || index < 0 || index >= points.length) return null;
  const next = points.filter((_, pointIndex) => pointIndex !== index);
  if (kind === "polygon" && !polygonHasArea(next)) return null;
  return next;
}

export function moveGraphicPathVertex(points: SchematicGraphicPoint[], kind: GraphicPathKind, index: number, x: number, y: number): SchematicGraphicPoint[] | null {
  if (!points[index]) return null;
  const next = points.map((point, pointIndex) => pointIndex === index ? { x: Math.max(0, Math.min(1100, Math.round(x / 20) * 20)), y: Math.max(0, Math.min(780, Math.round(y / 20) * 20)) } : point);
  if (next.some((point, pointIndex) => pointIndex > 0 && point.x === next[pointIndex - 1].x && point.y === next[pointIndex - 1].y)) return null;
  if (kind === "polygon" && (next[0].x === next.at(-1)?.x && next[0].y === next.at(-1)?.y || !polygonHasArea(next))) return null;
  return next;
}
