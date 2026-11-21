import type { ComponentInstance } from "../types/electrical";
import { reorderSchematicGraphic, type GraphicStackOrder } from "./graphicOps";

export function componentsInStackOrder(components: readonly ComponentInstance[]): ComponentInstance[] {
  return [...components].sort((left, right) => (left.zIndex ?? Infinity) - (right.zIndex ?? Infinity));
}

export function reorderComponents(components: ComponentInstance[], ids: string[], order: GraphicStackOrder): ComponentInstance[] {
  const current = componentsInStackOrder(components);
  const ordered = reorderSchematicGraphic(current, ids, order);
  if (ordered === current) return components;
  const indices = new Map(ordered.map((component, index) => [component.id, index]));
  return components.map((component) => {
    const zIndex = indices.get(component.id)!;
    return component.zIndex === zIndex ? component : { ...component, zIndex };
  });
}
