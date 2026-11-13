import type { ComponentInstance } from "../types/electrical";
import { componentFootprint } from "./componentGeometry";

export function toggleComponentSelection(selectedIds: string[], componentId: string): string[] {
  if (!componentId) return selectedIds;
  return selectedIds.includes(componentId) ? selectedIds.filter((id) => id !== componentId) : [...selectedIds, componentId];
}

export function componentsInMarquee(components: ComponentInstance[], x1: number, y1: number, x2: number, y2: number): string[] {
  const left = Math.min(x1, x2); const right = Math.max(x1, x2);
  const top = Math.min(y1, y2); const bottom = Math.max(y1, y2);
  return components.filter((component) => {
    const bounds = componentFootprint(component.x, component.y, component.rotation, component.definitionId, component.size ?? 1);
    return bounds.left <= right && bounds.right >= left && bounds.top <= bottom && bounds.bottom >= top;
  }).map((component) => component.id);
}
