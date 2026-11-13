import type { SchematicGraphic } from "../types/electrical";

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
