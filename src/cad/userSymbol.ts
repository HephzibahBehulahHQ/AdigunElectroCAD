import type { SchematicGraphic, UserSymbolGraphic } from "../types/electrical";

/** Center a drafted shape on a component origin and fit it inside the user-symbol body. */
export function schematicGraphicToSymbolGraphic(graphic: SchematicGraphic): UserSymbolGraphic {
  const sourcePoints = graphic.points ?? [{ x: graphic.x1, y: graphic.y1 }, { x: graphic.x2, y: graphic.y2 }];
  const xs = sourcePoints.map((point) => point.x);
  const ys = sourcePoints.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
  const fit = Math.min(1, 90 / Math.max(1, maxX - minX), 50 / Math.max(1, maxY - minY));
  const local = (x: number, y: number) => ({ x: (x - centerX) * fit, y: (y - centerY) * fit });
  const first = local(graphic.x1, graphic.y1); const second = local(graphic.x2, graphic.y2);
  return {
    kind: graphic.kind,
    x1: first.x, y1: first.y, x2: second.x, y2: second.y,
    ...(graphic.points ? { points: graphic.points.map((point) => local(point.x, point.y)) } : {}),
    color: graphic.color,
    ...(graphic.fillColor === undefined ? {} : { fillColor: graphic.fillColor }),
    strokeWidth: graphic.strokeWidth,
  };
}
