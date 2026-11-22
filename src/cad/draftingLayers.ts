import type { CircuitDocument, DraftingEntity, DraftingLayer, DraftingStyle } from "../types/electrical";

export const MAX_DRAFTING_LAYERS = 64;
export const draftingLineTypes = ["solid", "dashed", "dotted"] as const;

export function validLineWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= .5 && value <= 12;
}

export function validDraftingStyle(style: DraftingStyle): boolean {
  return (style.draftingColor === undefined || /^#[0-9a-f]{6}$/i.test(style.draftingColor)) &&
    (style.lineWeight === undefined || validLineWeight(style.lineWeight)) &&
    (style.lineType === undefined || draftingLineTypes.includes(style.lineType));
}

export function resolveDraftingStyle(entity: DraftingEntity, layers: readonly DraftingLayer[] = []): DraftingStyle {
  const layer = layers.find((item) => item.id === entity.layerId);
  return {
    draftingColor: entity.draftingColor ?? layer?.draftingColor,
    lineWeight: entity.lineWeight ?? layer?.lineWeight,
    lineType: entity.lineType ?? layer?.lineType,
  };
}

export function draftingDashArray(lineType: DraftingStyle["lineType"]): string | undefined {
  if (lineType === "solid") return "none";
  if (lineType === "dashed") return "7 4";
  if (lineType === "dotted") return "1 4";
}

export type DraftingSelection = { kind: "components" | "wires"; id: string };
type DraftingEditResult = { ok: true; document: CircuitDocument } | { ok: false; reason: string };

export function updateEntityDrafting(document: CircuitDocument, selection: DraftingSelection, patch: Partial<DraftingEntity>, addedLayer?: DraftingLayer): DraftingEditResult {
  const entities = document[selection.kind];
  const entity = entities.find((item) => item.id === selection.id);
  if (!entity) return { ok: false, reason: "Select a component or wire." };
  const layerId = "layerId" in patch ? patch.layerId : entity.layerId;
  const next = { ...entity, ...patch };
  const layers = document.draftingLayers ?? [];
  if (!validDraftingStyle(next) || (layerId !== undefined && !layers.some((item) => item.id === layerId) && addedLayer?.id !== layerId)) {
    return { ok: false, reason: "Choose an existing layer and a lineweight from 0.5 to 12 drawing units." };
  }
  if (!addedLayer && Object.keys(patch).every((key) => next[key as keyof DraftingEntity] === entity[key as keyof DraftingEntity])) return { ok: true, document };
  return { ok: true, document: {
    ...document,
    revision: document.revision + 1,
    [selection.kind]: entities.map((item) => item.id === selection.id ? next : item),
    ...(addedLayer && { draftingLayers: [...layers, addedLayer] }),
  } };
}

export function createEntityLayer(document: CircuitDocument, selection: DraftingSelection, rawName: string): DraftingEditResult {
  const name = rawName.trim();
  const layers = document.draftingLayers ?? [];
  if (!name || name.length > 64) return { ok: false, reason: "Enter a layer name from 1 to 64 characters." };
  if (layers.length >= MAX_DRAFTING_LAYERS) return { ok: false, reason: "This sheet already has 64 named layers." };
  if (layers.some((item) => item.name.toLowerCase() === name.toLowerCase())) return { ok: false, reason: "That layer name already exists." };
  let ordinal = 1;
  while (layers.some((item) => item.id === `layer-${ordinal}`)) ordinal++;
  const layer = { id: `layer-${ordinal}`, name };
  return updateEntityDrafting(document, selection, { layerId: layer.id }, layer);
}

export function updateDraftingLayer(document: CircuitDocument, id: string, patch: DraftingStyle & Pick<DraftingLayer, "hidden">): DraftingEditResult {
  const layers = document.draftingLayers ?? [];
  const existing = layers.find((layer) => layer.id === id);
  if (!existing) return { ok: false, reason: "Choose an existing drafting layer." };
  const next = { ...existing, ...patch };
  if (!validDraftingStyle(next)) return { ok: false, reason: "Choose a valid color, line type and lineweight from 0.5 to 12 drawing units." };
  if (next.hidden !== undefined && typeof next.hidden !== "boolean") return { ok: false, reason: "Choose a valid layer visibility." };
  if (next.hidden === existing.hidden && next.draftingColor === existing.draftingColor && next.lineType === existing.lineType && next.lineWeight === existing.lineWeight) return { ok: true, document };
  return { ok: true, document: { ...document, revision: document.revision + 1, draftingLayers: layers.map((layer) => layer.id === id ? next : layer) } };
}
