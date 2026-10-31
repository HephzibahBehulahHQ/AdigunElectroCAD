import type { CircuitDocument } from "../types/electrical";

export function moveComponent(document: CircuitDocument, componentId: string, deltaX: number, deltaY: number): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component) return document;
  return {
    ...document,
    revision: document.revision + 1,
    components: document.components.map((item) => item.id === componentId ? { ...item, x: item.x + deltaX, y: item.y + deltaY } : item),
  };
}
