import type { CircuitDocument, ComponentInstance, TerminalEndpoint, Wire } from "../types/electrical";
import { componentFootprint, instanceFootprint } from "./componentGeometry";

export type PlacementLayout = "reference" | "free";
type PlacementView = { x: number; y: number; width: number; height: number };
const placementLayout = (document: CircuitDocument): PlacementLayout => document.id === "reference-dol-motor-starter" ? "reference" : "free";

export function createManualWire(document: CircuitDocument, from: TerminalEndpoint, to: TerminalEndpoint, branch?: { wireId: string; source: "from" | "to"; position: number }): Wire {
  let index = 1;
  while (document.wires.some((wire) => wire.id === `manual-wire-${index}` || wire.netName === `MANUAL_${index}`)) index++;
  return { id: `manual-wire-${index}`, from, to, points: [], netName: `MANUAL_${index}`, ...(branch ? { branchOfWireId: branch.wireId, branchSource: branch.source, branchPosition: branch.position } : {}) };
}

export function moveComponentToGrid(document: CircuitDocument, componentId: string, x: number, y: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || !Number.isFinite(x) || !Number.isFinite(y)) return { document, ok: false, reason: "Invalid component position." };
  const snappedX = Math.round(x / 20) * 20; const snappedY = Math.round(y / 20) * 20;
  if (!canPlaceComponent(document.components, componentId, snappedX, snappedY, undefined, undefined, placementLayout(document))) return { document, ok: false, reason: "Move blocked: symbol or label clearance is unavailable." };
  if (component.x === snappedX && component.y === snappedY) return { document, ok: true };
  return { document: moveComponent(document, componentId, snappedX - component.x, snappedY - component.y), ok: true };
}

export function moveComponentsByGrid(document: CircuitDocument, componentIds: string[], deltaX: number, deltaY: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  return moveComponentsByOffset(document, componentIds, Math.round(deltaX / 20) * 20, Math.round(deltaY / 20) * 20);
}

export function moveComponentsByOffset(document: CircuitDocument, componentIds: string[], dx: number, dy: number, dragPrecision?: number): { document: CircuitDocument; ok: boolean; reason?: string } {
  const ids = [...new Set(componentIds)];
  if (!ids.length || !Number.isFinite(dx) || !Number.isFinite(dy)) return { document, ok: false, reason: "Select components and enter a finite movement." };
  const selected = document.components.filter((component) => ids.includes(component.id));
  if (selected.length !== ids.length) return { document, ok: false, reason: "One or more selected components no longer exist." };
  if (dx === 0 && dy === 0) return { document, ok: true };
  const selectedIds = new Set(ids);
  const stationary = document.components.filter((component) => !selectedIds.has(component.id));
  const moved = new Map(selected.map((component) => {
    const x = component.x + dx;
    const y = component.y + dy;
    return [component.id, {
      ...component,
      x: dx === 0 || dragPrecision === undefined ? x : Number(x.toFixed(dragPrecision)),
      y: dy === 0 || dragPrecision === undefined ? y : Number(y.toFixed(dragPrecision)),
    }];
  }));
  if (selected.every((component) => {
    const position = moved.get(component.id);
    return position?.x === component.x && position?.y === component.y;
  })) return { document, ok: true };
  for (const component of moved.values()) {
    if (!canPlaceComponent([...stationary, component], component.id, component.x, component.y, undefined, undefined, placementLayout(document))) {
      return { document, ok: false, reason: "Move blocked: selected symbols need clear space at the destination." };
    }
  }
  return {
    document: { ...document, revision: document.revision + 1, components: document.components.map((component) => moved.get(component.id) ?? component) },
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

export function rotateComponent(document: CircuitDocument, componentId: string, requestedRotation?: ComponentInstance["rotation"]): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component) return document;
  const rotation = requestedRotation ?? (component.rotation === 270 ? 0 : (component.rotation + 90) as 90 | 180 | 270);
  if (rotation === component.rotation) return document;
  return { ...document, revision: document.revision + 1, components: document.components.map((item) => item.id === componentId ? { ...item, rotation } : item) };
}

export type ComponentTransform =
  | { kind: "resize"; size: number }
  | { kind: "rotate"; rotation: ComponentInstance["rotation"] };

export function transformComponent(document: CircuitDocument, componentId: string, transform: ComponentTransform, clearanceComponents = document.components): { document: CircuitDocument; ok: boolean; reason?: string } {
  if (transform.kind === "resize") return resizeComponent(document, componentId, transform.size);
  const component = document.components.find((item) => item.id === componentId);
  if (!component || ![0, 90, 180, 270].includes(transform.rotation)) return { document, ok: false, reason: "Choose a valid right-angle rotation." };
  const candidate = { ...component, rotation: transform.rotation };
  const clearance = clearanceComponents.map((item) => item.id === componentId ? candidate : item);
  if (!canPlaceComponent(clearance, componentId, component.x, component.y, undefined, undefined, placementLayout(document))) return { document, ok: false, reason: "Rotation blocked by symbol or label clearance." };
  return { document: rotateComponent(document, componentId, transform.rotation), ok: true };
}

export function updateComponentProperty(document: CircuitDocument, componentId: string, property: string, value: string | number | boolean): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || component.properties[property] === value) return document;
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

export function reconnectWire(document: CircuitDocument, wireId: string, target: TerminalEndpoint, side: "from" | "to" = "to"): CircuitDocument {
  const current = document.wires.find((wire) => wire.id === wireId);
  if (!current || sameEndpoint(current[side], target)) return document;
  const replacement: Wire = { ...current, [side]: target, points: [] };
  if (side === "from") {
    delete replacement.branchOfWireId;
    delete replacement.branchSource;
    delete replacement.branchPosition;
  }
  const replacements = new Map<string, Wire>([[wireId, replacement]]);
  const branchesByParent = new Map<string, Wire[]>();
  for (const wire of document.wires) {
    if (!wire.branchOfWireId) continue;
    const siblings = branchesByParent.get(wire.branchOfWireId) ?? [];
    siblings.push(wire);
    branchesByParent.set(wire.branchOfWireId, siblings);
  }
  const pending = [replacement];
  while (pending.length) {
    const parent = pending.pop()!;
    for (const branch of branchesByParent.get(parent.id) ?? []) {
      const anchor = parent[branch.branchSource ?? "from"];
      if (replacements.has(branch.id) || sameEndpoint(branch.from, anchor)) continue;
      const next = { ...branch, from: anchor };
      replacements.set(next.id, next);
      pending.push(next);
    }
  }
  return { ...document, revision: document.revision + 1, wires: document.wires.map((wire) => replacements.get(wire.id) ?? wire) };
}

function sameEndpoint(left: TerminalEndpoint, right: TerminalEndpoint): boolean {
  return left.componentId === right.componentId && left.terminalId === right.terminalId;
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

export function findOpenPlacement(components: ComponentInstance[], layout: PlacementLayout, definitionId?: string, view?: PlacementView): { x: number; y: number } | null {
  if (layout === "free" && view) {
    const footprint = componentFootprint(0, 0, 0, definitionId);
    const firstX = Math.ceil((view.x - footprint.left + 12) / 20) * 20;
    const firstY = Math.ceil((view.y - footprint.top + 12) / 20) * 20;
    const lastX = view.x + view.width - footprint.right - 12;
    const lastY = view.y + view.height - footprint.bottom - 12;
    const stepX = Math.ceil((footprint.right - footprint.left + 20) / 20) * 20;
    const stepY = Math.ceil((footprint.bottom - footprint.top + 20) / 20) * 20;
    for (let y = firstY; y <= lastY; y += stepY) {
      for (let x = firstX; x <= lastX; x += stepX) {
        if (canPlaceComponent(components, "", x, y, definitionId)) return { x, y };
      }
    }
    return null;
  }
  const columns = layout === "reference" ? [940, 800, 660] : [180, 360, 540, 720, 900];
  const rows = layout === "reference" ? [140, 260, 380, 500] : [160, 280, 400, 520, 640];
  for (const x of columns) {
    for (const y of rows) {
      if (canPlaceComponent(components, "", x, y, definitionId, undefined, layout)) return { x, y };
    }
  }
  return null;
}

export function canPlaceComponent(components: ComponentInstance[], componentId: string, x: number, y: number, definitionId?: string, size?: number, layout: PlacementLayout = "free"): boolean {
  const moving = components.find((component) => component.id === componentId);
  const rotation = moving?.rotation ?? 0;
  const movingDefinitionId = definitionId ?? moving?.definitionId;
  const movingSize = size ?? moving?.size ?? 1;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(movingSize) || movingSize < .5 || movingSize > 2) return false;
  const bounds = moving && movingDefinitionId
    ? instanceFootprint({ ...moving, x, y, definitionId: movingDefinitionId, size: movingSize })
    : componentFootprint(x, y, rotation, movingDefinitionId, movingSize);
  if (layout === "reference" && (bounds.left < 10 || bounds.right > 1090 || bounds.top < 90 || bounds.bottom > 770)) return false;
  return components.every((component) => component.id === componentId || !overlaps(bounds, instanceFootprint(component)));
}

export function nextComponentReference(components: ComponentInstance[], referencePrefix: string): string {
  const usedReferences = new Set(components.map((component) => component.reference.toLowerCase()));
  let suffix = 1;
  while (usedReferences.has(`${referencePrefix}${suffix}`.toLowerCase())) suffix += 1;
  return `${referencePrefix}${suffix}`;
}

export function duplicateComponentInstance(components: ComponentInstance[], source: ComponentInstance, id: string, referencePrefix: string, layout: PlacementLayout = "free"): ComponentInstance | null {
  if (components.some((component) => component.id === id) || !components.some((component) => component.id === source.id)) return null;
  const reference = nextComponentReference(components, referencePrefix);
  const candidateId = `__duplicate_candidate__${id}`;
  const candidate: ComponentInstance = { ...source, id: candidateId };
  const augmented = [...components, candidate];
  const positions = duplicatePlacementOffsets();
  for (const [dx, dy] of positions) {
    const x = source.x + dx; const y = source.y + dy;
    if (canPlaceComponent(augmented, candidateId, x, y, undefined, undefined, layout)) {
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
  if (!canPlaceComponent(document.components, componentId, component.x, component.y, component.definitionId, size, placementLayout(document))) return { document, ok: false, reason: "Resize blocked: the symbol, terminals and labels need more clear space." };
  if ((component.size ?? 1) === size) return { document, ok: true };
  return { document: { ...document, revision: document.revision + 1, components: document.components.map((item) => item.id === componentId ? { ...item, size } : item) }, ok: true };
}

export function positionCustomTerminal(document: CircuitDocument, componentId: string, terminalId: string, offset: { x: number; y: number }): { document: CircuitDocument; ok: true } | { document: CircuitDocument; ok: false; reason: string } {
  const component = document.components.find((item) => item.id === componentId);
  if (!component?.customTerminals?.some((terminal) => terminal.id === terminalId) || !/^t[3-8]$/.test(terminalId)) {
    return { document, ok: false, reason: "Select an added terminal to position." };
  }
  if (![offset.x, offset.y].every((value) => Number.isFinite(value) && Math.abs(value) <= 60)) {
    return { document, ok: false, reason: "Added terminal offsets must be between -60 and 60 units." };
  }
  const previous = component.customTerminalOffsets?.[terminalId];
  if (previous?.x === offset.x && previous.y === offset.y) return { document, ok: true };
  const candidate = { ...component, customTerminalOffsets: { ...component.customTerminalOffsets, [terminalId]: offset } };
  const components = document.components.map((item) => item.id === componentId ? candidate : item);
  if (!canPlaceComponent(components, componentId, candidate.x, candidate.y, undefined, undefined, placementLayout(document))) {
    return { document, ok: false, reason: "Terminal move blocked: the new anchor needs clear space." };
  }
  return { document: { ...document, components, revision: document.revision + 1 }, ok: true };
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

function overlaps(left: ReturnType<typeof componentFootprint>, right: ReturnType<typeof componentFootprint>): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

