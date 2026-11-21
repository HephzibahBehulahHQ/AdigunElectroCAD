import type { DrawingGuide } from "../types/electrical";
import type { DrawingPoint } from "./drawingCamera";

export const MAX_DRAWING_GUIDES = 128;

export function snapToDrawingGuides(point: DrawingPoint, guides: readonly DrawingGuide[], tolerance: number) {
  const snapped = { ...point };
  const distances = { x: tolerance, y: tolerance };
  const axes = new Set<DrawingGuide["axis"]>();
  for (const guide of guides) {
    if (guide.hidden) continue;
    const distance = Math.abs(guide.coordinate - point[guide.axis]);
    if (distance > distances[guide.axis] || distance === distances[guide.axis] && axes.has(guide.axis)) continue;
    distances[guide.axis] = distance;
    snapped[guide.axis] = guide.coordinate;
    axes.add(guide.axis);
  }
  return { point: snapped, axes };
}
