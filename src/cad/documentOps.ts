import type { CircuitDocument, ComponentInstance } from "../types/electrical";

export type PlacementLayout = "reference" | "free";

const componentWidth = 110;
const componentHeight = 70;

export function moveComponent(document: CircuitDocument, componentId: string, deltaX: number, deltaY: number): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component) return document;
  return {
    ...document,
    revision: document.revision + 1,
    components: document.components.map((item) => item.id === componentId ? { ...item, x: item.x + deltaX, y: item.y + deltaY } : item),
  };
}

export function findOpenPlacement(components: ComponentInstance[], layout: PlacementLayout): { x: number; y: number } | null {
  const columns = layout === "reference" ? [940, 800, 660] : [180, 360, 540, 720, 900];
  const rows = layout === "reference" ? [140, 240, 340, 440, 540] : [160, 280, 400, 520, 640];
  for (const x of columns) {
    for (const y of rows) {
      if (canPlaceComponent(components, "", x, y)) return { x, y };
    }
  }
  return null;
}

export function canPlaceComponent(components: ComponentInstance[], componentId: string, x: number, y: number): boolean {
  return components.every((component) => component.id === componentId || !overlaps(x, y, component.x, component.y));
}

export function removeComponent(document: CircuitDocument, componentId: string): { document: CircuitDocument; removedWireCount: number } {
  if (!document.components.some((component) => component.id === componentId)) return { document, removedWireCount: 0 };
  const wires = document.wires.filter((wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId);
  return { document: { ...document, revision: document.revision + 1, components: document.components.filter((component) => component.id !== componentId), wires }, removedWireCount: document.wires.length - wires.length };
}

function overlaps(leftX: number, leftY: number, rightX: number, rightY: number): boolean {
  return Math.abs(leftX - rightX) < componentWidth && Math.abs(leftY - rightY) < componentHeight;
}
