import type { CircuitDocument, ComponentInstance, TerminalEndpoint } from "../types/electrical";
import { componentFootprint } from "./componentGeometry";

export type PlacementLayout = "reference" | "free";

export function moveComponentToGrid(document: CircuitDocument, componentId: string, x: number, y: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || !Number.isFinite(x) || !Number.isFinite(y)) return { document, ok: false, reason: "Invalid component position." };
  const snappedX = Math.round(x / 20) * 20; const snappedY = Math.round(y / 20) * 20;
  const bounds = componentFootprint(snappedX, snappedY, component.rotation);
  if (bounds.left < 10 || bounds.right > 1090 || bounds.top < 90 || bounds.bottom > 770) return { document, ok: false, reason: "Keep the symbol and its labels inside the drawing area." };
  if (!canPlaceComponent(document.components, componentId, snappedX, snappedY)) return { document, ok: false, reason: "Move blocked: symbol or label clearance overlaps another component." };
  if (component.x === snappedX && component.y === snappedY) return { document, ok: true };
  return { document: moveComponent(document, componentId, snappedX - component.x, snappedY - component.y), ok: true };
}


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

export function renameWire(document: CircuitDocument, wireId: string, netName: string): CircuitDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) return document;
  return { ...document, revision: document.revision + 1, wires: document.wires.map((wire) => wire.id === wireId ? { ...wire, netName } : wire) };
}

export function reconnectWire(document: CircuitDocument, wireId: string, target: TerminalEndpoint): CircuitDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) return document;
  return { ...document, revision: document.revision + 1, wires: document.wires.map((wire) => wire.id === wireId ? { ...wire, to: target, points: [] } : wire) };
}

export function removeWire(document: CircuitDocument, wireId: string): CircuitDocument {
  if (!document.wires.some((wire) => wire.id === wireId)) return document;
  return { ...document, revision: document.revision + 1, wires: document.wires.filter((wire) => wire.id !== wireId) };
}

export function findOpenPlacement(components: ComponentInstance[], layout: PlacementLayout): { x: number; y: number } | null {
  const columns = layout === "reference" ? [940, 800, 660] : [180, 360, 540, 720, 900];
  const rows = layout === "reference" ? [140, 260, 380, 500] : [160, 280, 400, 520, 640];
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
  const left = componentFootprint(leftX, leftY, leftRotation);
  const right = componentFootprint(rightX, rightY, rightRotation);
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}
