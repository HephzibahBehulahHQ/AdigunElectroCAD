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

export function rotateComponent(document: CircuitDocument, componentId: string): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component) return document;
  const rotation = component.rotation === 270 ? 0 : (component.rotation + 90) as 90 | 180 | 270;
  return { ...document, revision: document.revision + 1, components: document.components.map((item) => item.id === componentId ? { ...item, rotation } : item) };
}

export function updateComponentProperty(document: CircuitDocument, componentId: string, property: string, value: string | number | boolean): CircuitDocument {
  if (!document.components.some((component) => component.id === componentId)) return document;
  return {
    ...document,
    revision: document.revision + 1,
    components: document.components.map((component) => component.id === componentId ? {
      ...component,
      properties: { ...component.properties, [property]: value },
    } : component),
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
  const rotation = components.find((component) => component.id === componentId)?.rotation ?? 0;
  return components.every((component) => component.id === componentId || !overlaps(x, y, rotation, component.x, component.y, component.rotation));
}

export function removeComponent(document: CircuitDocument, componentId: string): { document: CircuitDocument; removedWireCount: number } {
  if (!document.components.some((component) => component.id === componentId)) return { document, removedWireCount: 0 };
  const wires = document.wires.filter((wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId);
  return { document: { ...document, revision: document.revision + 1, components: document.components.filter((component) => component.id !== componentId), wires }, removedWireCount: document.wires.length - wires.length };
}

function overlaps(leftX: number, leftY: number, leftRotation: ComponentInstance["rotation"], rightX: number, rightY: number, rightRotation: ComponentInstance["rotation"]): boolean {
  const [leftWidth, leftHeight] = dimensions(leftRotation);
  const [rightWidth, rightHeight] = dimensions(rightRotation);
  return Math.abs(leftX - rightX) < (leftWidth + rightWidth) / 2 && Math.abs(leftY - rightY) < (leftHeight + rightHeight) / 2;
}

function dimensions(rotation: ComponentInstance["rotation"]): [number, number] {
  return rotation === 90 || rotation === 270 ? [componentHeight, componentWidth] : [componentWidth, componentHeight];
}
