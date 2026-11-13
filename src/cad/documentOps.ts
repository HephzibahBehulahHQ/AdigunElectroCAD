import type { CircuitDocument, ComponentInstance, TerminalEndpoint, Wire } from "../types/electrical";
import { componentFootprint, componentFitsSheet } from "./componentGeometry";

export type PlacementLayout = "reference" | "free";

export function createManualWire(document: CircuitDocument, from: TerminalEndpoint, to: TerminalEndpoint, branch?: { wireId: string; source: "from" | "to"; position: number }): Wire {
  let index = 1;
  while (document.wires.some((wire) => wire.id === `manual-wire-${index}` || wire.netName === `MANUAL_${index}`)) index++;
  return { id: `manual-wire-${index}`, from, to, points: [], netName: `MANUAL_${index}`, ...(branch ? { branchOfWireId: branch.wireId, branchSource: branch.source, branchPosition: branch.position } : {}) };
}

export function moveComponentToGrid(document: CircuitDocument, componentId: string, x: number, y: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || !Number.isFinite(x) || !Number.isFinite(y)) return { document, ok: false, reason: "Invalid component position." };
  const snappedX = Math.round(x / 20) * 20; const snappedY = Math.round(y / 20) * 20;
  if (!componentFitsSheet(snappedX, snappedY, component.rotation, component.definitionId, component.size ?? 1)) return { document, ok: false, reason: "Keep the symbol and its labels inside the drawing area." };
  if (!canPlaceComponent(document.components, componentId, snappedX, snappedY)) return { document, ok: false, reason: "Move blocked: symbol or label clearance overlaps another component." };
  if (component.x === snappedX && component.y === snappedY) return { document, ok: true };
  return { document: moveComponent(document, componentId, snappedX - component.x, snappedY - component.y), ok: true };
}

export function moveComponentsByGrid(document: CircuitDocument, componentIds: string[], deltaX: number, deltaY: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const ids = [...new Set(componentIds)];
  if (!ids.length || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return { document, ok: false, reason: "Select components and use a finite grid movement." };
  const selected = document.components.filter((component) => ids.includes(component.id));
  if (selected.length !== ids.length) return { document, ok: false, reason: "One or more selected components no longer exist." };
  const dx = Math.round(deltaX / 20) * 20; const dy = Math.round(deltaY / 20) * 20;
  if (dx === 0 && dy === 0) return { document, ok: true };
  const selectedIds = new Set(ids);
  const stationary = document.components.filter((component) => !selectedIds.has(component.id));
  for (const component of selected) {
    if (!canPlaceComponent([...stationary, component], component.id, component.x + dx, component.y + dy)) {
      return { document, ok: false, reason: "Move blocked: keep selected symbols and labels inside the sheet and clear of neighbors." };
    }
  }
  return {
    document: { ...document, revision: document.revision + 1, components: document.components.map((component) => selectedIds.has(component.id) ? { ...component, x: component.x + dx, y: component.y + dy } : component) },
    ok: true,
  };
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
  const removed = new Set([wireId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const wire of document.wires) if (wire.branchOfWireId && removed.has(wire.branchOfWireId) && !removed.has(wire.id)) { removed.add(wire.id); changed = true; }
  }
  return { ...document, revision: document.revision + 1, wires: document.wires.filter((wire) => !removed.has(wire.id)) };
}

export function findOpenPlacement(components: ComponentInstance[], layout: PlacementLayout, definitionId?: string): { x: number; y: number } | null {
  const columns = layout === "reference" ? [940, 800, 660] : [180, 360, 540, 720, 900];
  const rows = layout === "reference" ? [140, 260, 380, 500] : [160, 280, 400, 520, 640];
  for (const x of columns) {
    for (const y of rows) {
      if (canPlaceComponent(components, "", x, y, definitionId)) return { x, y };
    }
  }
  return null;
}

export function canPlaceComponent(components: ComponentInstance[], componentId: string, x: number, y: number, definitionId?: string, size?: number): boolean {
  const moving = components.find((component) => component.id === componentId);
  const rotation = moving?.rotation ?? 0;
  const movingDefinitionId = definitionId ?? moving?.definitionId;
  const movingSize = size ?? moving?.size ?? 1;
  if (!componentFitsSheet(x, y, rotation, movingDefinitionId, movingSize)) return false;
  return components.every((component) => component.id === componentId || !overlaps(x, y, rotation, movingDefinitionId, movingSize, component));
}

export function duplicateComponentInstance(components: ComponentInstance[], source: ComponentInstance, id: string, referencePrefix: string): ComponentInstance | null {
  if (components.some((component) => component.id === id) || !components.some((component) => component.id === source.id)) return null;
  const usedReferences = new Set(components.map((component) => component.reference.toLowerCase()));
  let suffix = 1;
  while (usedReferences.has(`${referencePrefix}${suffix}`.toLowerCase())) suffix += 1;
  const reference = `${referencePrefix}${suffix}`;
  const candidateId = `__duplicate_candidate__${id}`;
  const candidate: ComponentInstance = { ...source, id: candidateId };
  const augmented = [...components, candidate];
  const positions = duplicatePlacementOffsets();
  for (const [dx, dy] of positions) {
    const x = source.x + dx; const y = source.y + dy;
    if (canPlaceComponent(augmented, candidateId, x, y)) {
      return { ...source, id, reference, x, y, properties: { ...source.properties }, ...(source.terminalLabels ? { terminalLabels: { ...source.terminalLabels } } : {}), ...(source.customTerminals ? { customTerminals: source.customTerminals.map((terminal) => ({ ...terminal })) } : {}), ...(source.customTerminalOffsets ? { customTerminalOffsets: Object.fromEntries(Object.entries(source.customTerminalOffsets).map(([terminalId, point]) => [terminalId, { ...point }])) } : {}), ...(source.customSymbolGraphics ? { customSymbolGraphics: source.customSymbolGraphics.map((graphic) => ({ ...graphic, ...(graphic.points ? { points: graphic.points.map((point) => ({ ...point })) } : {}) })) } : {}), ...(source.customProperties ? { customProperties: { ...source.customProperties } } : {}) };
    }
  }
  return null;
}

function duplicatePlacementOffsets() {
  const offsets: Array<[number, number]> = [];
  for (let distance = 40; distance <= 400; distance += 40) {
    offsets.push([distance, distance], [0, distance], [-distance, distance], [distance, 0], [-distance, 0], [0, -distance], [distance, -distance], [-distance, -distance]);
  }
  return offsets;
}

export function resizeComponent(document: CircuitDocument, componentId: string, size: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || !Number.isFinite(size) || size < .5 || size > 2) return { document, ok: false, reason: "Symbol size must be between 50% and 200%." };
  if (!canPlaceComponent(document.components, componentId, component.x, component.y, component.definitionId, size)) return { document, ok: false, reason: "Resize blocked: keep the symbol, terminals and labels clear of other components and the sheet edge." };
  if ((component.size ?? 1) === size) return { document, ok: true };
  return { document: { ...document, revision: document.revision + 1, components: document.components.map((item) => item.id === componentId ? { ...item, size } : item) }, ok: true };
}

export function removeComponent(document: CircuitDocument, componentId: string): { document: CircuitDocument; removedWireCount: number } {
  if (!document.components.some((component) => component.id === componentId)) return { document, removedWireCount: 0 };
  const removedRoots = document.wires.filter((wire) => wire.from.componentId === componentId || wire.to.componentId === componentId).map((wire) => wire.id);
  const removed = new Set(removedRoots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const wire of document.wires) if (wire.branchOfWireId && removed.has(wire.branchOfWireId) && !removed.has(wire.id)) { removed.add(wire.id); changed = true; }
  }
  const wires = document.wires.filter((wire) => !removed.has(wire.id));
  return { document: { ...document, revision: document.revision + 1, components: document.components.filter((component) => component.id !== componentId), wires }, removedWireCount: document.wires.length - wires.length };
}

function overlaps(leftX: number, leftY: number, leftRotation: ComponentInstance["rotation"], leftDefinitionId: string | undefined, leftSize: number, rightComponent: ComponentInstance): boolean {
  const left = componentFootprint(leftX, leftY, leftRotation, leftDefinitionId, leftSize);
  const right = componentFootprint(rightComponent.x, rightComponent.y, rightComponent.rotation, rightComponent.definitionId, rightComponent.size ?? 1);
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

