import { automaticWireBends, findAutomaticWireBends, wireRouteObstacles } from "../cad/automaticWireRoute";
import { displayTerminalLabel } from "../electrical/terminalLabels";
import type { CircuitDocument, SchematicAnnotation, SchematicGraphic, SchematicGraphicKind, SchematicGraphicPoint, UserSymbolGraphic, Wire, DraftingStyle } from "../types/electrical";
import type { DolSimulationState } from "../simulation/dolSimulator";
import type { TerminalEndpoint, CircuitSheet, ProjectContinuation } from "../types/electrical";
import { catalogById } from "../catalog/dolCatalog";
import { draftingDashArray, entitiesInDraftingLayerOrder, resolveDraftingStyle } from "../cad/draftingLayers";
import { componentsInStackOrder } from "../cad/componentStack";
import { componentsInMarquee, previewComponentMove } from "../cad/componentSelection";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "./functionalSymbols";
import { canPlaceComponent, nextComponentReference, transformComponent, type ComponentTransform } from "../cad/documentOps";
import { ComponentTransformHandles } from "./ComponentTransformHandles";
import { DrawingRulers } from "./DrawingRulers";
import { PrintFrame } from "./PrintFrame";
import { snapToDrawingGuides } from "../cad/drawingGuides";
import { defaultDrawingGrid, snapDrawingCoordinate, visibleGridSpacing } from "../cad/drawingGrid";
import { componentFootprint, componentLabelOffsets, instanceFootprint } from "../cad/componentGeometry";
import { endpointKey, staticComponentIds, terminalAnchors, terminalHitRadius, type TerminalAnchor } from "../cad/terminalAnchors";
export { terminalAnchors } from "../cad/terminalAnchors";
import { insertWireRoutePointAt, orthogonalWirePath, wireBranchAtPoint, wireBranchRoute, type WireBranchSource } from "../cad/wirePath";
import { appendFreehandPoint, freehandPathBounds } from "../cad/freehandPath";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent } from "react";

type SchematicGraphicMode = SchematicGraphicKind | "freehand";

// Inline so standalone SVG and PNG exports retain the same authored strokes.
const componentDraftingStyles = `
  [data-component-lineweight] :is(.free-symbol, .generic-symbol-mark, .functional-symbol),
  [data-component-lineweight] :is(.generic-symbol-mark, .functional-symbol) :is(path, line, circle, ellipse, rect, polygon, polyline) {
    stroke-width: var(--component-lineweight);
  }
  [data-component-linetype] :is(.free-symbol, .generic-symbol-mark, .functional-symbol) {
    stroke-dasharray: var(--component-linetype);
  }
  [data-component-ink] :is(.free-symbol, .generic-symbol-mark, .functional-symbol) {
    stroke: var(--component-ink);
  }
`;

interface Props {
  symbolStates?: ReadonlyMap<string, CircuitDocument["components"][number]["properties"]>;
  onPlaceComponent?: (x: number, y: number) => void;
  placementPreviewDefinitionId?: string;
  placementDragging?: boolean;
  onComponentDrop?: (definitionId: string, x: number, y: number) => void;
  onComponentTransform?: (componentId: string, transform: ComponentTransform) => void;
  onMove?: (componentId: string, x: number, y: number) => void;
  onMovePreview?: (componentId: string, delta: { x: number; y: number } | null) => void;
  zoom?: number;
  freeView?: { x: number; y: number; width: number; height: number };
  onAddGuide?: (axis: "x" | "y", coordinate: number) => void;
  showGrid?: boolean;
  litIndicatorIds?: ReadonlySet<string>;
  document: CircuitDocument;
  selectedComponentId: string;
  selectedComponentIds?: string[];
  selectedWireId: string;
  simulation: DolSimulationState;
  wireMode: boolean;
  wireStart: TerminalEndpoint | null;
  wireBends?: readonly SchematicGraphicPoint[];
  onWireBend?: (point: SchematicGraphicPoint) => void;
  onSelect: (componentId: string, additive?: boolean) => void;
  onComponentContextMenu?: (componentId: string, clientX: number, clientY: number) => void;
  onGroupSelect?: (componentIds: string[], additive: boolean) => void;
  onWireSelect: (wireId: string) => void;
  onWireBranchStart?: (wireId: string, source: WireBranchSource, position: number) => void;
  wireRouteEditId?: string;
  onWireRouteChange?: (wireId: string, points: SchematicGraphicPoint[]) => void;
  onTerminalSelect: (endpoint: TerminalEndpoint, continueBranch?: boolean) => void;
  annotationMode?: boolean;
  selectedAnnotationId?: string;
  onAnnotationSelect?: (id: string) => void;
  onAnnotationPlace?: (x: number, y: number) => void;
  onAnnotationMove?: (id: string, x: number, y: number) => void;
  graphicMode?: SchematicGraphicMode | null;
  selectedGraphicId?: string;
  selectedGraphicIds?: string[];
  onGraphicSelect?: (id: string, additive?: boolean) => void;
  onGraphicCreate?: (kind: SchematicGraphicKind, x1: number, y1: number, x2: number, y2: number, points?: SchematicGraphicPoint[]) => void;
  onGraphicMove?: (id: string, dx: number, dy: number) => void;
  onGraphicResize?: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
  onGraphicVertexMove?: (id: string, index: number, x: number, y: number) => void;
  onGraphicVertexInsert?: (id: string, x: number, y: number) => void;
  onGraphicVertexDelete?: (id: string, index: number) => void;
  continuations?: ProjectContinuation[];
  projectSheets?: CircuitSheet[];
  activeSheetId?: string;
  onContinuationNavigate?: (sheetId: string) => void;
  selectedContinuationId?: string;
  onContinuationSelect?: (continuationId: string) => void;
}

const isSameEndpoint = (left: TerminalEndpoint | null, right: TerminalEndpoint) => Boolean(left && left.componentId === right.componentId && left.terminalId === right.terminalId);

function TerminalHitTarget({ anchor, component, radius, markerRadius, wireMode, wireStart, onSelect }: {
  anchor: TerminalAnchor;
  component: CircuitDocument["components"][number] | undefined;
  radius: number;
  markerRadius: number;
  wireMode: boolean;
  wireStart: TerminalEndpoint | null;
  onSelect: Props["onTerminalSelect"];
}) {
  const { endpoint, x, y } = anchor;
  const key = endpointKey(endpoint);
  const terminals = component?.customTerminals ?? catalogById.get(component?.definitionId ?? "")?.terminals ?? [];
  const index = terminals.findIndex(({ id }) => id === endpoint.terminalId);
  const pin = component && index >= 0
    ? component.terminalLabels?.[endpoint.terminalId] ?? displayTerminalLabel(component.properties, index, terminals[index].label)
    : endpoint.terminalId;
  const label = "Wire terminal " + (component?.reference ?? endpoint.componentId) + " " + pin;
  const active = isSameEndpoint(wireStart, endpoint);
  return <g data-wire-terminal={key} role="button" tabIndex={0} aria-label={label} aria-pressed={active}
    onClick={(event) => { event.stopPropagation(); onSelect(endpoint, event.shiftKey); }}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(endpoint, event.shiftKey);
    }}>
    <circle cx={x} cy={y} r={radius} fill="transparent" />
    {wireMode && <circle cx={x} cy={y} r={markerRadius} pointerEvents="none" vectorEffect="non-scaling-stroke" className={active ? "terminal-anchor active" : "terminal-anchor"} />}
    <title>{label + " · Shift-click target to continue branch"}</title>
  </g>;
}

function wirePath(from: TerminalAnchor, to: TerminalAnchor, points: readonly { x: number; y: number }[] = []): string { return orthogonalWirePath(from, to, points, from.vertical, to.vertical); }

function PlacedAnnotation({ annotation, selected, onSelect, onMove }: { annotation: SchematicAnnotation; selected: boolean; onSelect: (id: string) => void; onMove?: Props["onAnnotationMove"] }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const size = annotation.fontSize ?? 18;
  const lines = annotation.text.split(/\r?\n/);
  const lineSpacing = annotation.lineSpacing ?? 1.2;
  const width = Math.max(size * 3, ...lines.map((line) => line.length * size * .52 + 10));
  const height = Math.max(size * 1.35, lines.length * size * lineSpacing + size * .15);
  const textAnchor = annotation.textAnchor ?? "start";
  const outlineX = textAnchor === "middle" ? -width / 2 : textAnchor === "end" ? -width : -5;
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  return <g data-drawing-selected={selected || undefined} data-annotation-id={annotation.id} transform={`translate(${annotation.x} ${annotation.y}) rotate(${annotation.rotation ?? 0})`} onClick={(event) => { event.stopPropagation(); onSelect(annotation.id); }} onPointerDown={(event) => {
    if (!onMove || event.button !== 0) return;
    event.stopPropagation(); onSelect(annotation.id); origin.current = point(event) ?? null;
    if (origin.current) event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerUp={(event) => {
    const start = origin.current; const current = point(event); origin.current = null;
    if (start && current && Math.hypot(current.x - start.x, current.y - start.y) > 4) onMove?.(annotation.id, annotation.x + current.x - start.x, annotation.y + current.y - start.y);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }} style={{ cursor: onMove ? "move" : "pointer", touchAction: "none" }}>
    {annotation.backgroundColor && <rect x={outlineX} y={-size * 1.1} width={width} height={height} rx="2" fill={annotation.backgroundColor} />}
    {selected && <rect data-export-exclude="" x={outlineX} y={-size * 1.1} width={width} height={height} rx="3" fill="none" stroke="#e0a526" strokeDasharray="4 3" />}
    <text x="0" y="0" textAnchor={textAnchor} fill={annotation.color} fontSize={size} fontWeight={annotation.fontWeight ?? 600} fontStyle={annotation.fontStyle ?? "normal"} paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3" strokeLinejoin="round">{lines.map((line, index) => <tspan key={index} x="0" dy={index === 0 ? 0 : size * lineSpacing}>{line || " "}</tspan>)}</text>
  </g>;
}

function PlacedGraphic({ graphic, selected, onSelect, onMove, onResize, onVertexMove, onVertexInsert, onVertexDelete, snapSpacing = 20 }: { snapSpacing?: number | null; graphic: SchematicGraphic; selected: boolean; onSelect: NonNullable<Props["onGraphicSelect"]>; onMove?: Props["onGraphicMove"]; onResize?: Props["onGraphicResize"]; onVertexMove?: Props["onGraphicVertexMove"]; onVertexInsert?: Props["onGraphicVertexInsert"]; onVertexDelete?: Props["onGraphicVertexDelete"] }) {
  const gesture = useRef<{ mode: "move" | "resize" | "vertex"; start: { x: number; y: number }; handle?: string; index?: number } | null>(null);
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const x = Math.min(graphic.x1, graphic.x2); const y = Math.min(graphic.y1, graphic.y2);
  const width = Math.abs(graphic.x2 - graphic.x1); const height = Math.abs(graphic.y2 - graphic.y1);
  const points = graphic.points ?? [];
  const pointList = points.map((vertex) => `${vertex.x},${vertex.y}`).join(" ");
  const shape = graphic.kind === "line"
    ? <line x1={graphic.x1} y1={graphic.y1} x2={graphic.x2} y2={graphic.y2} fill="none" />
    : graphic.kind === "polyline"
      ? <polyline points={pointList} fill="none" />
      : graphic.kind === "polygon"
        ? <polygon points={pointList} fill={graphic.fillColor ?? "none"} />
    : graphic.kind === "rectangle"
      ? <rect x={x} y={y} width={width} height={height} fill={graphic.fillColor ?? "none"} />
      : <ellipse cx={(graphic.x1 + graphic.x2) / 2} cy={(graphic.y1 + graphic.y2) / 2} rx={width / 2} ry={height / 2} fill={graphic.fillColor ?? "none"} />;
  const handles = graphic.kind === "line"
    ? [{ id: "start", x: graphic.x1, y: graphic.y1 }, { id: "end", x: graphic.x2, y: graphic.y2 }]
    : [{ id: "nw", x, y }, { id: "ne", x: x + width, y }, { id: "sw", x, y: y + height }, { id: "se", x: x + width, y: y + height }];
  return <g data-drawing-selected={selected || undefined} data-graphic-id={graphic.id} data-graphic-kind={graphic.kind} onClick={(event) => { event.stopPropagation(); onSelect(graphic.id, event.shiftKey); }} onDoubleClick={(event) => { if (!graphic.points || !onVertexInsert) return; event.stopPropagation(); const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM(); const current = matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null; if (current) onVertexInsert(graphic.id, current.x, current.y); }} onPointerDown={(event) => {
    if (event.shiftKey) return;
    if (!onMove || event.button !== 0) return;
    event.stopPropagation(); onSelect(graphic.id); const start = point(event);
    gesture.current = start ? { mode: "move", start } : null;
    if (gesture.current) event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerUp={(event) => {
    const active = gesture.current; const current = point(event); gesture.current = null;
    if (active && current && Math.hypot(current.x - active.start.x, current.y - active.start.y) > 4) {
      if (active.mode === "move") onMove?.(graphic.id, current.x - active.start.x, current.y - active.start.y);
      else if (active.mode === "vertex" && active.index !== undefined) onVertexMove?.(graphic.id, active.index, current.x, current.y);
      else {
        const snappedX = snapDrawingCoordinate(current.x, snapSpacing);
        const snappedY = snapDrawingCoordinate(current.y, snapSpacing);
        if (graphic.kind === "line") onResize?.(graphic.id, active.handle === "start" ? snappedX : graphic.x1, active.handle === "start" ? snappedY : graphic.y1, active.handle === "end" ? snappedX : graphic.x2, active.handle === "end" ? snappedY : graphic.y2);
        else {
          const opposite = { x: active.handle?.includes("w") ? x + width : x, y: active.handle?.includes("n") ? y + height : y };
          onResize?.(graphic.id, opposite.x, opposite.y, snappedX, snappedY);
        }
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }} onPointerCancel={() => { gesture.current = null; }} style={{ cursor: onMove ? "move" : "pointer", touchAction: "none" }}>
    {selected && <rect x={x - 5} y={y - 5} width={Math.max(10, width + 10)} height={Math.max(10, height + 10)} fill="none" stroke="#e0a526" strokeDasharray="4 3" pointerEvents="none" />}
    <g stroke={graphic.color} strokeWidth={graphic.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">{shape}</g>
    {graphic.kind === "rectangle" && <rect x={x} y={y} width={width} height={height} fill="transparent" pointerEvents="all" />}
    {graphic.kind === "ellipse" && <ellipse cx={(graphic.x1 + graphic.x2) / 2} cy={(graphic.y1 + graphic.y2) / 2} rx={width / 2} ry={height / 2} fill="transparent" pointerEvents="all" />}
    {graphic.kind === "line" && <line x1={graphic.x1} y1={graphic.y1} x2={graphic.x2} y2={graphic.y2} stroke="transparent" strokeWidth={Math.max(12, graphic.strokeWidth + 8)} />}
    {graphic.kind === "polyline" && <polyline points={pointList} fill="none" stroke="transparent" strokeWidth={Math.max(12, graphic.strokeWidth + 8)} />}
    {graphic.kind === "polygon" && <polygon points={pointList} fill="transparent" stroke="transparent" strokeWidth={Math.max(12, graphic.strokeWidth + 8)} />}
    {selected && onResize && handles.map((handle) => <circle key={handle.id} data-resize-handle={handle.id} cx={handle.x} cy={handle.y} r="6" fill="#fff" stroke="#e0a526" strokeWidth="2" aria-label={`Resize ${graphic.name} from ${handle.id}`} onPointerDown={(event) => {
      event.stopPropagation(); const start = point(event); gesture.current = start ? { mode: "resize", start, handle: handle.id } : null;
      if (gesture.current) event.currentTarget.setPointerCapture(event.pointerId);
    }} />)}
    {selected && onVertexMove && graphic.points?.map((vertex, index) => <circle key={index} data-vertex-handle={index} cx={vertex.x} cy={vertex.y} r="6" fill="#fff" stroke="#e0a526" strokeWidth="2" aria-label={`Drag to move ${graphic.name} vertex ${index + 1}; right-click to remove`} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onVertexDelete?.(graphic.id, index); }} onPointerDown={(event) => {
      event.stopPropagation(); const start = point(event); gesture.current = start ? { mode: "vertex", start, index } : null;
      if (gesture.current) event.currentTarget.setPointerCapture(event.pointerId);
    }} />)}
    <text x={x + width / 2} y={y + height + 17} textAnchor="middle" fontSize="11" fontWeight="700" fill={graphic.color} paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3" pointerEvents="none" textLength={graphic.name.length > 16 ? 150 : undefined} lengthAdjust="spacingAndGlyphs">{graphic.name}</text>
    <title>{`${graphic.name} · drafting geometry; not an electrical connection`}</title>
  </g>;
}

const componentBox = (id: string, selected: string, onSelect: (componentId: string) => void, x: number, y: number, width: number, height: number) => ({
  onClick: () => onSelect(id),
  className: id === selected ? "schematic-component selected" : "schematic-component",
  children: <rect x={x} y={y} width={width} height={height} rx="6" className="selection-boundary" />,
});

export function SixTerminalWindings({ x, y, productName }: { x: number; y: number; productName?: string }) {
  return <g aria-label={productName ? `${productName}, six winding terminals U1 V1 W1 U2 V2 W2 and PE` : "Three-phase induction motor with six accessible winding terminals U1 V1 W1 U2 V2 W2 and PE"}>
    <circle cx={x} cy={y} r="27" fill="#f7fbff" stroke="#24456b" strokeWidth="2.5" />
    {[-30, 0, 30].map((offset, index) => <g key={offset}>
      <path d={`M${x + offset} ${y - 42}V${y - 27}M${x + offset} ${y + 27}V${y + 42}`} stroke="#24456b" strokeWidth="2" />
      <circle cx={x + offset} cy={y - 42} r="2.5" fill="#24456b" />
      <circle cx={x + offset} cy={y + 42} r="2.5" fill="#24456b" />
      <text x={x + offset} y={y - 46} textAnchor="middle" fontSize="9" fontWeight="700" fill="#102a43" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3">{["U1", "V1", "W1"][index]}</text>
      <text x={x + offset} y={y + 56} textAnchor="middle" fontSize="9" fontWeight="700" fill="#102a43" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3">{["U2", "V2", "W2"][index]}</text>
    </g>)}
    <path d={`M${x - 47} ${y}H${x - 27}`} stroke="#167a52" strokeWidth="2" />
    <circle cx={x - 47} cy={y} r="2.5" fill="#167a52" />
    <text x={x - 51} y={y - 5} textAnchor="end" fontSize="9" fontWeight="700" fill="#167a52" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3">PE</text>
    <text x={x} y={y - 1} textAnchor="middle" fontSize="17" fontWeight="800" fill="#102a43">M</text>
    <text x={x} y={y + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#102a43">3~</text>
  </g>;
}

function PlacedSymbol({ component, evaluatedProperties, indicatorLit, draftingStyle, selectedComponentId, selectedComponentIds = [], onSelect, onMove, onMovePreview, onOpenContextMenu, previewDelta, wireMode, terminalAnchorsForComponent }: { component: CircuitDocument["components"][number]; evaluatedProperties?: CircuitDocument["components"][number]["properties"]; indicatorLit?: boolean; draftingStyle: DraftingStyle; selectedComponentId: string; selectedComponentIds?: string[]; onSelect: Props["onSelect"]; onMove?: Props["onMove"]; onMovePreview?: Props["onMovePreview"]; onOpenContextMenu?: Props["onComponentContextMenu"]; previewDelta?: { x: number; y: number }; wireMode?: boolean; terminalAnchorsForComponent: TerminalAnchor[] }) {
  const definition = catalogById.get(component.definitionId);
  const labels = componentLabelOffsets(component.rotation, component.definitionId);
  const typeLabel = typeof component.properties.indication === "string" && component.properties.indication.trim() ? component.properties.indication.trim() : definition?.referencePrefix ?? "?";
  const displayLabel = component.displayName?.trim() ? `${component.displayName.trim()} · ${typeLabel}`.slice(0, 32) : typeLabel.slice(0, 24);
  const symbolProperties: CircuitDocument["components"][number]["properties"] = { ...component.properties, ...evaluatedProperties, runtimeLampLit: indicatorLit === true };
  const componentFrame = definition?.simulationModelId === "catalog-safety-relay"
    ? { selectX: 82, selectY: 62, selectWidth: 164, selectHeight: 124, symbolX: 64, symbolY: 48, symbolWidth: 128, symbolHeight: 96 }
    : { selectX: 55, selectY: 35, selectWidth: 110, selectHeight: 70, symbolX: 47, symbolY: 27, symbolWidth: 94, symbolHeight: 54 };
  (component.customTerminals ?? definition?.terminals ?? []).forEach((terminal, index) => { const label = component.terminalLabels?.[terminal.id]; if (label) symbolProperties["terminalLabel" + (index + 1)] = label; });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const visualDelta = previewDelta ?? delta;
  return <g onClick={(event) => { event.stopPropagation(); if (dragged.current) { dragged.current = false; return; } onSelect(component.id, event.shiftKey); }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onOpenContextMenu?.(component.id, event.clientX, event.clientY); }} transform={`translate(${visualDelta.x} ${visualDelta.y})`} style={{ touchAction: wireMode ? "auto" : "none", cursor: onMove && !wireMode ? "grab" : undefined }}
    onPointerDown={(event) => {
      if (!onMove || wireMode || event.button !== 0) return;
      const start = point(event); if (!start) return;
      event.stopPropagation(); if (!event.shiftKey && !selectedComponentIds.includes(component.id)) onSelect(component.id); origin.current = { x: start.x, y: start.y }; dragged.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = point(event); if (!origin.current || !current) return;
      const nextDelta = { x: Math.round((current.x - origin.current.x) * 100) / 100, y: Math.round((current.y - origin.current.y) * 100) / 100 };
      setDelta(nextDelta); onMovePreview?.(component.id, nextDelta);
    }}
    onPointerUp={(event) => {
      const current = point(event); const start = origin.current;
      origin.current = null; setDelta({ x: 0, y: 0 }); onMovePreview?.(component.id, null);
      if (start && current && Math.hypot(current.x - start.x, current.y - start.y) > 4) { dragged.current = true; onMove?.(component.id, component.x + current.x - start.x, component.y + current.y - start.y); }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { origin.current = null; setDelta({ x: 0, y: 0 }); onMovePreview?.(component.id, null); }}
    onLostPointerCapture={() => { origin.current = null; setDelta({ x: 0, y: 0 }); onMovePreview?.(component.id, null); }}
    className={(selectedComponentIds.length ? selectedComponentIds.includes(component.id) : component.id === selectedComponentId) ? "schematic-component selected" : "schematic-component"}>
    <g transform={`translate(${component.x} ${component.y}) scale(${component.size ?? 1}) translate(${-component.x} ${-component.y})`}><g transform={`rotate(${component.rotation} ${component.x} ${component.y})`} style={{ "--component-ink": draftingStyle.draftingColor, "--component-lineweight": draftingStyle.lineWeight, "--component-linetype": draftingDashArray(draftingStyle.lineType) } as CSSProperties} data-component-ink={draftingStyle.draftingColor} data-component-lineweight={draftingStyle.lineWeight} data-component-linetype={draftingStyle.lineType}><rect x={component.x - componentFrame.selectX} y={component.y - componentFrame.selectY} width={componentFrame.selectWidth} height={componentFrame.selectHeight} rx="6" className="selection-boundary" />{(!definition || !hasDedicatedFunctionalSymbol(definition.symbolId)) && <rect x={component.x - componentFrame.symbolX} y={component.y - componentFrame.symbolY} width={componentFrame.symbolWidth} height={componentFrame.symbolHeight} rx="4" className="free-symbol" />}{component.customSymbolGraphics?.length ? component.customSymbolGraphics.map((graphic, index) => <UserSymbolGraphicMark key={`${component.id}-symbol-${index}`} graphic={graphic} x={component.x} y={component.y} draftingStyle={draftingStyle} />) : definition?.simulationModelId === "six-terminal-windings" ? <SixTerminalWindings x={component.x} y={component.y} productName={definition.name} /> : <>{definition && <FunctionalSymbol symbolId={definition.symbolId} x={component.x} y={component.y} properties={symbolProperties} componentName={definition.name} />}{definition && !hasDedicatedFunctionalSymbol(definition.symbolId) && <GenericSymbol symbolId={definition.symbolId} x={component.x} y={component.y} />}</>}</g></g>
    {terminalAnchorsForComponent.map(({ endpoint, x: anchorX, y: anchorY, vertical }) => { const x = anchorX - visualDelta.x, y = anchorY - visualDelta.y; if (definition?.symbolId === "user-indicator-lamp" && /^t[12]$/.test(endpoint.terminalId)) return null; const terminals = component.customTerminals ?? definition?.terminals ?? []; const index = terminals.findIndex((item) => item.id === endpoint.terminalId); const label = index < 0 ? undefined : component.terminalLabels?.[endpoint.terminalId] ?? displayTerminalLabel(component.properties, index, terminals[index].label); if (!label) return null; const left = x < component.x; const stacked = vertical || (definition?.simulationModelId === "catalog-safety-relay" && Math.abs(y - component.y) > Math.abs(x - component.x)); return <text key={endpoint.terminalId} x={x + (stacked ? 0 : left ? -8 : 8)} y={y - (stacked ? 8 : 4)} textAnchor={stacked ? "middle" : left ? "end" : "start"} textLength={stacked && label.length > 3 ? 18 : undefined} lengthAdjust={stacked && label.length > 3 ? "spacingAndGlyphs" : undefined} className="free-terminal-label">{label}</text>; })}
    <g transform={`translate(${component.x} ${component.y}) scale(${component.size ?? 1}) translate(${-component.x} ${-component.y})`}><text x={component.x} y={component.y + labels.reference} className="free-reference" textAnchor="middle" textLength={component.reference.length > 6 ? 78 : undefined} lengthAdjust="spacingAndGlyphs" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="4" strokeLinejoin="round">{component.reference}</text>
    <text x={component.x} y={component.y + labels.kind} className="free-kind" textAnchor="middle" textLength={displayLabel.length > 12 ? 78 : undefined} lengthAdjust="spacingAndGlyphs">{displayLabel}</text></g>
  </g>;
}

function ComponentPlacementPreview({ document, definitionId, resolvePoint, dragging }: {
  document: CircuitDocument;
  definitionId: string;
  resolvePoint: (point: { x: number; y: number }) => { x: number; y: number };
  dragging: boolean;
}) {
  const marker = useRef<SVGGElement>(null);
  const clientPoint = useRef<{ clientX: number; clientY: number } | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const svg = marker.current?.ownerSVGElement;
    if (!svg) return;
    const track = (event: { clientX: number; clientY: number }) => {
      clientPoint.current = { clientX: event.clientX, clientY: event.clientY };
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const next = resolvePoint(new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()));
      setPoint(previous => previous?.x === next.x && previous.y === next.y ? previous : next);
    };
    const clear = () => { clientPoint.current = null; setPoint(null); };
    const dragLeave = (event: DragEvent) => {
      if (!(event.relatedTarget instanceof Node) || !svg.contains(event.relatedTarget)) clear();
    };
    const events = new AbortController();
    const options = { signal: events.signal };
    if (dragging) {
      svg.addEventListener("dragover", track, options);
      svg.addEventListener("dragleave", dragLeave, options);
    } else {
      svg.addEventListener("pointermove", track, options);
      svg.addEventListener("pointerleave", clear, options);
    }
    if (clientPoint.current) track(clientPoint.current);
    return () => events.abort();
  }, [dragging, resolvePoint]);

  const definition = catalogById.get(definitionId);
  const component = point && definition ? {
    ...point, id: "placement-preview", definitionId, rotation: 0 as const,
    reference: nextComponentReference(document.components, definition.referencePrefix), properties: definition.propertiesSchema,
  } : null;
  const bounds = component ? componentFootprint(component.x, component.y, component.rotation, definitionId) : null;
  const clear = component && canPlaceComponent(document.components, "", component.x, component.y, definitionId);
  return <g ref={marker} className={clear ? "component-placement-preview" : "component-placement-preview blocked"} data-export-exclude="" pointerEvents="none" aria-hidden="true">
    {component && bounds && <>
      <rect className="component-placement-outline" x={bounds.left} y={bounds.top} width={bounds.right - bounds.left} height={bounds.bottom - bounds.top} />
      <PlacedSymbol component={component} draftingStyle={{}} selectedComponentId="" onSelect={() => {}}
        terminalAnchorsForComponent={terminalAnchors({ ...document, components: [component], wires: [] })} />
    </>}
  </g>;
}

function wireDraftingStyle(wire: Wire, layers: CircuitDocument["draftingLayers"]): CSSProperties {
  const style = resolveDraftingStyle(wire, layers);
  return { stroke: style.draftingColor, strokeWidth: style.lineWeight, strokeDasharray: draftingDashArray(style.lineType) };
}

function UserSymbolGraphicMark({ graphic, x, y, draftingStyle }: { graphic: UserSymbolGraphic; x: number; y: number; draftingStyle: DraftingStyle }) {
  const stroke = draftingStyle.draftingColor ?? graphic.color;
  const strokeWidth = draftingStyle.lineWeight ?? graphic.strokeWidth;
  const strokeDasharray = draftingDashArray(draftingStyle.lineType);
  const fill = graphic.fillColor ?? "none";
  if (graphic.kind === "line") return <line x1={x + graphic.x1} y1={y + graphic.y1} x2={x + graphic.x2} y2={y + graphic.y2} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
  if (graphic.kind === "rectangle") return <rect x={x + Math.min(graphic.x1, graphic.x2)} y={y + Math.min(graphic.y1, graphic.y2)} width={Math.abs(graphic.x2 - graphic.x1)} height={Math.abs(graphic.y2 - graphic.y1)} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill={fill} />;
  if (graphic.kind === "ellipse") return <ellipse cx={x + (graphic.x1 + graphic.x2) / 2} cy={y + (graphic.y1 + graphic.y2) / 2} rx={Math.abs(graphic.x2 - graphic.x1) / 2} ry={Math.abs(graphic.y2 - graphic.y1) / 2} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill={fill} />;
  const points = graphic.points ?? [];
  const svgPoints = points.map((point) => `${x + point.x},${y + point.y}`).join(" ");
  return graphic.kind === "polygon" ? <polygon points={svgPoints} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill={fill} /> : <polyline points={svgPoints} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill="none" />;
}

export function GenericSymbol({ symbolId, x, y }: { symbolId: string; x: number; y: number }) {
  if (symbolId.startsWith("motor-ac-") || /^motor-\d+$/.test(symbolId) || symbolId === "motor-3phase" || symbolId === "motor-3p") return <g className="generic-symbol-mark"><circle cx={x} cy={y} r="20" /><text x={x} y={y - 2} textAnchor="middle" className="functional-symbol-text">M</text><text x={x} y={y + 12} textAnchor="middle" className="functional-symbol-text">3~</text></g>;
  if (symbolId.includes("motor")) return <circle cx={x + 25} cy={y - 9} r="12" className="generic-symbol-mark" />;
  if (symbolId.includes("supply")) return <g className="generic-symbol-mark">{[-14, 0, 14].map((offset) => <path key={offset} d={`M ${x + offset} ${y - 20} V ${y - 5}`} />)}</g>;
  if (symbolId.includes("breaker") || symbolId.includes("fuse")) return <g className="generic-symbol-mark">{[-16, 0, 16].map((offset) => <path key={offset} d={`M ${x + offset - 5} ${y - 20} L ${x + offset + 5} ${y - 7}`} />)}</g>;
  if (symbolId.includes("starter") || symbolId.includes("contactor")) return <g className="generic-symbol-mark">{[-14, 0, 14].map((offset) => <path key={offset} d={`M ${x + offset - 4} ${y - 20} V ${y - 13} L ${x + offset + 5} ${y - 7}`} />)}</g>;
  if (symbolId.includes("relay") || symbolId.includes("timer")) return <g className="generic-symbol-mark"><path d={`M ${x - 30} ${y - 13} H ${x - 12} M ${x + 12} ${y - 13} H ${x + 30}`} /><circle cx={x} cy={y - 13} r="9" /></g>;
  if (symbolId.includes("switch")) return <path d={`M ${x - 24} ${y - 8} L ${x} ${y - 22} M ${x} ${y - 8} H ${x + 24}`} className="generic-symbol-mark" />;
  if (symbolId.includes("transformer")) return <g className="generic-symbol-mark"><path d={`M ${x - 19} ${y - 22} Q ${x - 4} ${y - 13} ${x - 19} ${y - 4} M ${x + 19} ${y - 22} Q ${x + 4} ${y - 13} ${x + 19} ${y - 4} M ${x - 2} ${y - 23} V ${y - 3} M ${x + 3} ${y - 23} V ${y - 3}`} /></g>;
  if (symbolId.includes("sensor") || symbolId.includes("meter")) return <g className="generic-symbol-mark"><circle cx={x} cy={y - 13} r="12" /><path d={`M ${x - 25} ${y - 13} H ${x - 12} M ${x + 12} ${y - 13} H ${x + 25}`} /></g>;
  if (symbolId.includes("plc") || symbolId.includes("vfd") || symbolId.includes("safety")) return <g className="generic-symbol-mark"><rect x={x - 25} y={y - 25} width="50" height="24" rx="2" /><path d={`M ${x - 15} ${y - 19} H ${x + 15} M ${x - 15} ${y - 8} H ${x + 15}`} /></g>;
  if (symbolId.includes("terminal")) return <g className="generic-symbol-mark"><circle cx={x - 15} cy={y - 13} r="4" /><circle cx={x + 15} cy={y - 13} r="4" /><path d={`M ${x - 11} ${y - 13} H ${x + 11}`} /></g>;
  if (symbolId.includes("actuator")) return <g className="generic-symbol-mark"><path d={`M ${x - 24} ${y - 13} H ${x - 9} M ${x + 9} ${y - 13} H ${x + 24}`} /><rect x={x - 9} y={y - 21} width="18" height="16" rx="7" /></g>;
  return <path d={`M ${x - 25} ${y - 13} H ${x + 25}`} className="generic-symbol-mark" />;
}

function FreeSchematic({ document, symbolStates, onPlaceComponent, placementPreviewDefinitionId, placementDragging, litIndicatorIds, onComponentTransform, selectedComponentId, selectedComponentIds = [], selectedWireId, wireMode, wireStart, wireBends = [], onWireBend, onSelect, onComponentContextMenu, onComponentDrop, onGroupSelect, onWireSelect, onWireBranchStart, wireRouteEditId = "", onWireRouteChange, onTerminalSelect, onMove, zoom = .85, freeView, onAddGuide, showGrid = true, annotationMode = false, selectedAnnotationId = "", onAnnotationSelect = () => {}, onAnnotationPlace = () => {}, onAnnotationMove, graphicMode = null, selectedGraphicId = "", selectedGraphicIds = [], onGraphicSelect = () => {}, onGraphicCreate = () => {}, onGraphicMove, onGraphicResize, onGraphicVertexMove, onGraphicVertexInsert, onGraphicVertexDelete, continuations, projectSheets, activeSheetId, onContinuationNavigate, selectedContinuationId, onContinuationSelect }: Props) {
  const [transformPreview, setTransformPreview] = useState<{ id: string; action: ComponentTransform } | null>(null);
  const transformTarget = onComponentTransform && !wireMode && !graphicMode && !annotationMode && !wireRouteEditId && selectedComponentIds.length <= 1
    ? document.components.find((component) => component.id === selectedComponentId)
    : undefined;
  const transformed = transformTarget && transformPreview?.id === transformTarget.id
    ? transformComponent(document, transformTarget.id, transformPreview.action).document : document;
  const [previewMove, setPreviewMove] = useState<{ ids: string[]; delta: { x: number; y: number } } | null>(null);
  const updateMovePreview = (componentId: string, delta: { x: number; y: number } | null) => {
    if (!delta) { setPreviewMove(null); return; }
    const ids = selectedComponentIds.includes(componentId) ? selectedComponentIds : [componentId];
    setPreviewMove({ ids, delta });
  };
  const previewDocument = previewMove ? previewComponentMove(transformed, previewMove.ids, previewMove.delta.x, previewMove.delta.y) : transformed;
  const lockedLayers = new Set(document.draftingLayers?.filter(({ locked }) => locked).map(({ id }) => id));
  const hiddenLayers = new Set(document.draftingLayers?.filter(({ hidden }) => hidden).map(({ id }) => id));
  const paintOrder = entitiesInDraftingLayerOrder(componentsInStackOrder(transformed.components), document);
  const anchors = terminalAnchors({ ...previewDocument, components: previewMove ? entitiesInDraftingLayerOrder(componentsInStackOrder(previewDocument.components), document) : paintOrder });
  const visibleComponents = paintOrder.filter(({ layerId }) => !hiddenLayers.has(layerId ?? ""));
  const visibleIds = new Set(visibleComponents.map(({ id }) => id));
  const visibleAnchors = anchors.filter(({ endpoint }) => visibleIds.has(endpoint.componentId));
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const componentsById = new Map(document.components.map((component) => [component.id, component]));
  const routeStart = onWireBend && wireStart && visibleIds.has(wireStart.componentId) ? anchorIndex.get(endpointKey(wireStart)) : undefined;
  const [wirePointer, setWirePointer] = useState<(SchematicGraphicPoint & Partial<TerminalAnchor>) | null>(null);
  useEffect(() => { setWirePointer(null); }, [wireStart, document.id]);
  const pinsByComponent = new Map<string, TerminalAnchor[]>();
  for (const anchor of anchors) {
    const pins = pinsByComponent.get(anchor.endpoint.componentId);
    if (pins) pins.push(anchor);
    else pinsByComponent.set(anchor.endpoint.componentId, [anchor]);
  }
  const [routePreview, setRoutePreview] = useState<{ wireId: string; points: SchematicGraphicPoint[] } | null>(null);
  const routeObstacles = wireRouteObstacles(previewDocument.components.filter(({ id }) => visibleIds.has(id)));
  const previewTarget = wirePointer?.endpoint && anchorIndex.get(endpointKey(wirePointer.endpoint));
  const draftBends = routeStart && previewTarget && wireBends.length === 0
    ? findAutomaticWireBends(routeStart, previewTarget, routeObstacles)
    : wireBends;
  const currentRoutePoints = (wire: Wire) => {
    if (routePreview?.wireId === wire.id) return routePreview.points;
    if (wire.points.length || wire.branchOfWireId) return wire.points;
    const from = anchorIndex.get(endpointKey(wire.from));
    const to = anchorIndex.get(endpointKey(wire.to));
    return from && to ? automaticWireBends(from, to, routeObstacles) : wire.points;
  };
  const branchRouteForWire = (wire: Wire, seen = new Set<string>()): { point: { x: number; y: number }; points: { x: number; y: number }[] } | null => {
    if (!wire.branchOfWireId || !wire.branchSource || wire.branchPosition === undefined || seen.has(wire.id)) return null;
    const parent = document.wires.find((item) => item.id === wire.branchOfWireId);
    const from = parent && anchorIndex.get(endpointKey(parent.from)); const to = parent && anchorIndex.get(endpointKey(parent.to));
    if (!parent || !from || !to) return null;
    const nextSeen = new Set(seen); nextSeen.add(wire.id);
    const parentBranch = branchRouteForWire(parent, nextSeen);
    return wireBranchRoute(from, to, parentBranch?.points ?? currentRoutePoints(parent), from.vertical ?? false, to.vertical ?? false, wire.branchSource, wire.branchPosition);
  };
  const graphicStart = useRef<{ x: number; y: number } | null>(null);
  const selectionGesture = useRef<{ x: number; y: number; additive: boolean; moved: boolean } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const pathVertices = useRef<SchematicGraphicPoint[]>([]);
  const [graphicPreview, setGraphicPreview] = useState<{ kind: SchematicGraphicKind; x1: number; y1: number; x2: number; y2: number; points?: SchematicGraphicPoint[] } | null>(null);
  const routeGesture = useRef<{ wireId: string; index: number; points: SchematicGraphicPoint[] } | null>(null);
  const isPathMode = graphicMode === "polyline" || graphicMode === "polygon";
  useEffect(() => { pathVertices.current = []; graphicStart.current = null; setGraphicPreview(null); }, [graphicMode]);
  const graphicPoint = (event: ReactMouseEvent<SVGRectElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const settings = document.drawingGrid ?? defaultDrawingGrid;
  const snapSpacing = settings.snapEnabled ? settings.snapSpacing : null;
  const displaySpacing = visibleGridSpacing(settings.displaySpacing, zoom);
  const grid = (value: number) => snapDrawingCoordinate(value, snapSpacing);
  const svgPoint = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const snappedPathPoint = (x: number, y: number) => ({ x: grid(x), y: grid(y) });
  const routePointFromEvent = (event: PointerEvent<SVGCircleElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const moveRoutePoint = (event: PointerEvent<SVGCircleElement>, wireId: string) => {
    const gesture = routeGesture.current;
    if (!gesture || gesture.wireId !== wireId) return;
    const point = routePointFromEvent(event); if (!point) return;
    const snapped = snappedPathPoint(point.x, point.y);
    const points = gesture.points.map((item, index) => index === gesture.index ? snapped : item);
    gesture.points = points; setRoutePreview({ wireId, points });
  };
  const finishRoutePoint = (event: PointerEvent<SVGCircleElement>, wireId: string) => {
    moveRoutePoint(event, wireId);
    const gesture = routeGesture.current;
    routeGesture.current = null;
    if (gesture?.wireId === wireId) onWireRouteChange?.(wireId, gesture.points);
    setRoutePreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const finishPath = () => {
    if (!isPathMode || !graphicMode) return;
    const points = pathVertices.current;
    const minimum = graphicMode === "polygon" ? 3 : 2;
    if (points.length >= minimum) {
      const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
      onGraphicCreate(graphicMode, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), [...points]);
      pathVertices.current = [];
      setGraphicPreview(null);
    }
  };
  const addPathVertex = (event: PointerEvent<SVGSVGElement>) => {
    if (!isPathMode || !graphicMode) return;
    const point = svgPoint(event); if (!point) return;
    const snapped = snappedPathPoint(point.x, point.y);
    const last = pathVertices.current.at(-1);
    if (!last || last.x !== snapped.x || last.y !== snapped.y) pathVertices.current = [...pathVertices.current, snapped];
    const first = pathVertices.current[0]; const current = pathVertices.current.at(-1) ?? snapped;
    setGraphicPreview({ kind: graphicMode, x1: first?.x ?? current.x, y1: first?.y ?? current.y, x2: current.x, y2: current.y, points: [...pathVertices.current] });
  };
  const previewPathVertex = (event: PointerEvent<SVGSVGElement>) => {
    if (!isPathMode || !graphicMode || !pathVertices.current.length) return;
    const point = svgPoint(event); if (!point) return;
    const snapped = snappedPathPoint(point.x, point.y); const first = pathVertices.current[0];
    const points = [...pathVertices.current, snapped];
    setGraphicPreview({ kind: graphicMode, x1: first.x, y1: first.y, x2: snapped.x, y2: snapped.y, points });
  };
  const drawStart = (event: PointerEvent<SVGRectElement>) => {
    if (!graphicMode || wireMode || event.button !== 0) return;
    const point = graphicPoint(event); if (!point) return;
    event.preventDefault(); graphicStart.current = point;
    const start = graphicMode === "freehand"
      ? { x: point.x, y: point.y }
      : { x: grid(point.x), y: grid(point.y) };
    if (graphicMode === "freehand") {
      pathVertices.current = appendFreehandPoint([], start);
      setGraphicPreview({ kind: "polyline", x1: start.x, y1: start.y, x2: start.x, y2: start.y, points: [...pathVertices.current] });
    } else setGraphicPreview({ kind: graphicMode, x1: start.x, y1: start.y, x2: start.x, y2: start.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drawMove = (event: PointerEvent<SVGRectElement>) => {
    if (!graphicStart.current || !graphicMode) return;
    const point = graphicPoint(event); if (!point) return;
    if (graphicMode === "freehand") {
      pathVertices.current = appendFreehandPoint(pathVertices.current, point);
      const bounds = freehandPathBounds(pathVertices.current);
      if (bounds) setGraphicPreview({ kind: "polyline", ...bounds, points: [...pathVertices.current] });
      return;
    }
    setGraphicPreview((preview) => preview ? { ...preview, x2: grid(point.x), y2: grid(point.y) } : null);
  };
  const drawEnd = (event: PointerEvent<SVGRectElement>) => {
    const point = graphicPoint(event); const start = graphicStart.current; const kind = graphicMode;
    graphicStart.current = null; setGraphicPreview(null);
    if (start && point && kind === "freehand") {
      const points = appendFreehandPoint(pathVertices.current, point);
      const bounds = freehandPathBounds(points);
      const length = points.slice(1).reduce((sum, item, index) => sum + Math.hypot(item.x - points[index].x, item.y - points[index].y), 0);
      if (bounds && length >= 4) onGraphicCreate("polyline", bounds.x1, bounds.y1, bounds.x2, bounds.y2, points);
      pathVertices.current = [];
    } else if (start && point && kind && kind !== "freehand") {
      const x1 = grid(start.x); const y1 = grid(start.y);
      const x2 = grid(point.x); const y2 = grid(point.y);
      if (kind === "line" ? Math.hypot(x2 - x1, y2 - y1) >= 4 : Math.abs(x2 - x1) >= 4 && Math.abs(y2 - y1) >= 4) onGraphicCreate(kind, x1, y1, x2, y2);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const selectionStart = (event: PointerEvent<SVGRectElement>) => {
    if (graphicMode || wireMode || annotationMode || event.button !== 0 || !onGroupSelect) return;
    const point = graphicPoint(event); if (!point) return;
    event.preventDefault();
    selectionGesture.current = { x: point.x, y: point.y, additive: event.shiftKey, moved: false };
    setSelectionBox({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const selectionMove = (event: PointerEvent<SVGRectElement>) => {
    const start = selectionGesture.current; if (!start) return;
    const point = graphicPoint(event); if (!point) return;
    if (Math.hypot(point.x - start.x, point.y - start.y) > 4) start.moved = true;
    if (start.moved) setSelectionBox({ x1: start.x, y1: start.y, x2: point.x, y2: point.y });
  };
  const selectionEnd = (event: PointerEvent<SVGRectElement>) => {
    const start = selectionGesture.current; const point = graphicPoint(event);
    selectionGesture.current = null; setSelectionBox(null);
    if (start && point) {
      if (start.moved) onGroupSelect?.(componentsInMarquee(visibleComponents, start.x, start.y, point.x, point.y), start.additive);
      else if (!start.additive) onGroupSelect?.([], false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const drawingBounds = freeView ?? { x: 0, y: 0, width: 1100, height: 780 };
  const cursorReadout = useRef<HTMLOutputElement>(null);
  const draftingPoint = (point: { x: number; y: number }, grid: boolean, guides: boolean) => {
    const snap = snapToDrawingGuides(point, guides ? document.guides ?? [] : [], 8 / zoom);
    const format = (axis: "x" | "y") => snap.axes.has(axis) ? snap.point[axis] : grid ? snapDrawingCoordinate(point[axis], snapSpacing) : Math.round(point[axis] * 100) / 100;
    return { x: format("x"), y: format("y"), guideSnap: snap.axes.size > 0 };
  };
  return <div className="schematic-wrap free-drawing-viewport" onPointerMoveCapture={(event) => {
    const svg = event.currentTarget.querySelector("svg.schematic");
    const matrix = svg instanceof SVGSVGElement ? svg.getScreenCTM() : null;
    const readout = cursorReadout.current;
    if (!matrix || !readout) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const snapped = !!routeStart || annotationMode || (graphicMode && graphicMode !== "freehand");
    const { x, y, guideSnap } = draftingPoint(point, Boolean(snapped), annotationMode || !!onPlaceComponent);
    if (routeStart) {
      const target = event.target instanceof Element ? event.target.closest("[data-wire-terminal]")?.getAttribute("data-wire-terminal") : null;
      setWirePointer((target && anchorIndex.get(target)) || { x, y });
    }
    readout.textContent = `X ${x}  Y ${y}  du${guideSnap ? " · Guide snap" : snapped && settings.snapEnabled ? " · Grid snap" : ""}`;
  }} onPointerLeave={() => { if (cursorReadout.current) cursorReadout.current.textContent = "X —  Y —  du"; if (routeStart) setWirePointer(null); }}>
    <svg className="schematic" tabIndex={0} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, cursor: annotationMode || graphicMode || onPlaceComponent ? "crosshair" : undefined }} viewBox={`${drawingBounds.x} ${drawingBounds.y} ${drawingBounds.width} ${drawingBounds.height}`} role="group" aria-description="Focus a terminal and press Enter or Space to start or finish a wire." aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Free electrical schematic sheet"} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-adigun-electrocad-component")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }} onDrop={(event) => { const definitionId = event.dataTransfer.getData("application/x-adigun-electrocad-component"); if (!definitionId || !onComponentDrop) return; const matrix = event.currentTarget.getScreenCTM(); const point = matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null; if (!point) return; event.preventDefault(); const snapped = draftingPoint(point, false, true); onComponentDrop(definitionId, snapped.x, snapped.y); }} onClickCapture={(event) => {
      if (event.button !== 0) return;
      if (routeStart && onWireBend && event.target instanceof Element && !event.target.closest("[data-wire-terminal]")) {
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        event.stopPropagation();
        const { x, y } = draftingPoint(new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()), true, false);
        onWireBend({ x, y });
        return;
      }
      if (!onPlaceComponent) return; const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return; event.stopPropagation(); const point = draftingPoint(new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()), false, true); onPlaceComponent(point.x, point.y); }} onPointerDownCapture={(event) => { if (onPlaceComponent && event.button === 0) { event.stopPropagation(); return; } if (isPathMode) { event.stopPropagation(); addPathVertex(event); event.currentTarget.focus(); } }} onPointerMoveCapture={(event) => { if (isPathMode) { event.stopPropagation(); previewPathVertex(event); } }} onDoubleClickCapture={(event) => { if (isPathMode) { event.stopPropagation(); finishPath(); } }} onKeyDown={(event) => { if (isPathMode && event.key === "Enter") { event.preventDefault(); finishPath(); } else if (isPathMode && event.key === "Escape") { event.preventDefault(); pathVertices.current = []; setGraphicPreview(null); } }} onClick={(event) => {
      if (!annotationMode) return;
      const matrix = event.currentTarget.getScreenCTM();
      if (matrix) { const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); const snapped = draftingPoint(point, true, true); onAnnotationPlace(snapped.x, snapped.y); }
    }}>
      <style>{componentDraftingStyles}</style>
      <defs><pattern id="free-grid" data-export-grid-spacing={settings.displaySpacing} width={displaySpacing} height={displaySpacing} patternUnits="userSpaceOnUse"><path d={`M ${displaySpacing} 0 L 0 0 0 ${displaySpacing}`} fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect {...drawingBounds} data-viewport-fill="" className="sheet-bg" onPointerDown={(event) => { if (onPlaceComponent) return; if (graphicMode) drawStart(event); else selectionStart(event); }} onPointerMove={(event) => graphicMode ? drawMove(event) : selectionMove(event)} onPointerUp={(event) => graphicMode ? drawEnd(event) : selectionEnd(event)} onPointerCancel={() => { graphicStart.current = null; pathVertices.current = []; setGraphicPreview(null); selectionGesture.current = null; setSelectionBox(null); }} />{showGrid && <rect {...drawingBounds} data-viewport-fill="" fill="url(#free-grid)" pointerEvents="none" />}
      {isPathMode && <text data-export-exclude="" x="65" y="105" className="sheet-note" pointerEvents="none">Click vertices · double-click or Enter to finish · Escape cancels</text>}
      {graphicMode === "freehand" && <text data-export-exclude="" x="65" y="105" className="sheet-note" pointerEvents="none">Drag to sketch · select the path to edit its vertices, color, width and name</text>}
      {wireMode && <text data-export-exclude="" x="65" y="105" className="sheet-note" pointerEvents="none">Click a terminal to start or finish. Click empty space to add bends. Escape cancels.</text>}
      <g data-export-exclude="" className="drawing-guide-lines" pointerEvents="none">
        {document.guides?.filter(guide => !guide.hidden).map(({ id, axis, coordinate }) => axis === "x"
          ? <line key={id} x1={coordinate} x2={coordinate} y1={drawingBounds.y} y2={drawingBounds.y + drawingBounds.height} vectorEffect="non-scaling-stroke" />
          : <line key={id} y1={coordinate} y2={coordinate} x1={drawingBounds.x} x2={drawingBounds.x + drawingBounds.width} vectorEffect="non-scaling-stroke" />)}
      </g>
      {document.printLayout && <PrintFrame layout={document.printLayout} />}
      <g data-drawing-content="">
      {entitiesInDraftingLayerOrder(document.wires, document).map((wire) => {
        if (hiddenLayers.has(wire.layerId ?? "")) return null;
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        if (!from || !to) return null;
        const branch = branchRouteForWire(wire);
        const routePoints = currentRoutePoints(wire);
        const points = branch?.points ?? routePoints;
        const path = wirePath(from, to, points);
        const insertRoutePoint = (event: ReactMouseEvent<SVGPathElement>) => {
          event.stopPropagation();
          const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
          if (!matrix) return;
          const pointer = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
          const inserted = insertWireRoutePointAt(from, to, routePoints, from.vertical ?? false, to.vertical ?? false, pointer, 18 / zoom, snapSpacing);
          if (inserted) onWireRouteChange?.(wire.id, inserted.points);
        };
        const startBranch = (event: PointerEvent<SVGPathElement>) => {
          event.stopPropagation();
          const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
          const point = matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
          if (!point) return;
          const route = wireBranchAtPoint(from, to, points, from.vertical ?? false, to.vertical ?? false, point);
          if (route) onWireBranchStart?.(wire.id, route.source, route.position);
        };
        return <g key={wire.id}>
          <path d={path} style={wireDraftingStyle(wire, document.draftingLayers)} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} />
          {!wireMode && <path data-export-exclude="" d={path} fill="none" stroke="transparent" strokeWidth="14" pointerEvents="stroke" role="button" tabIndex={0}
            aria-label={`Select wire ${wire.netName ?? wire.id}`}
            onClick={(event) => { event.stopPropagation(); if (wireRouteEditId === wire.id && !wire.branchOfWireId && !lockedLayers.has(wire.layerId ?? "")) insertRoutePoint(event); else onWireSelect(wire.id); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onWireSelect(wire.id); } }} />}
          {wireRouteEditId === wire.id && !wire.branchOfWireId && !lockedLayers.has(wire.layerId ?? "") && <path d={path} className="wire-route-hit-target" aria-hidden="true" onClick={insertRoutePoint} />}
          {wireMode && !wireStart && onWireBranchStart && <path d={path} className="wire-branch-hit-target" role="button" tabIndex={0} aria-label={`Create a branch from ${wire.netName ?? wire.id}`} onClick={startBranch} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onWireBranchStart(wire.id, "from", .5); } }} />}
          {branch && <circle cx={branch.point.x} cy={branch.point.y} r="5" className="wire-junction" aria-label={`Electrical junction on ${wire.netName ?? wire.id}`} />}
          {wireRouteEditId === wire.id && !wire.branchOfWireId && !lockedLayers.has(wire.layerId ?? "") && routePoints.map((point, index) => <circle key={index} className="wire-route-handle" data-route-point={index} cx={point.x} cy={point.y} r="6" role="button" tabIndex={0} aria-label={`Route point ${index + 1} on ${wire.netName ?? wire.id}; drag to move or use arrow keys`} onPointerDown={(event) => { event.stopPropagation(); routeGesture.current = { wireId: wire.id, index, points: [...routePoints] }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => moveRoutePoint(event, wire.id)} onPointerUp={(event) => finishRoutePoint(event, wire.id)} onPointerCancel={() => { routeGesture.current = null; setRoutePreview(null); }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onWireRouteChange?.(wire.id, routePoints.filter((_, pointIndex) => pointIndex !== index)); }} onKeyDown={(event) => { const delta = (event.shiftKey ? 5 : 1) * (snapSpacing ?? 20); const move = event.key === "ArrowLeft" ? { x: -delta, y: 0 } : event.key === "ArrowRight" ? { x: delta, y: 0 } : event.key === "ArrowUp" ? { x: 0, y: -delta } : event.key === "ArrowDown" ? { x: 0, y: delta } : null; if (move) { event.preventDefault(); onWireRouteChange?.(wire.id, routePoints.map((item, pointIndex) => pointIndex === index ? snappedPathPoint(item.x + move.x, item.y + move.y) : item)); } else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onWireRouteChange?.(wire.id, routePoints.filter((_, pointIndex) => pointIndex !== index)); } }} />)}
        </g>;
      })}
      {(document.graphics ?? []).map((graphic) => <PlacedGraphic snapSpacing={snapSpacing} key={graphic.id} graphic={graphic} selected={selectedGraphicIds.includes(graphic.id) || graphic.id === selectedGraphicId} onSelect={onGraphicSelect} onMove={onGraphicMove} onResize={onGraphicResize} onVertexMove={onGraphicVertexMove} onVertexInsert={onGraphicVertexInsert} onVertexDelete={onGraphicVertexDelete} />)}
      {graphicPreview && <PlacedGraphic graphic={{ id: "__preview__", name: "Drawing preview", color: "#1565c0", strokeWidth: 2, ...graphicPreview }} selected={false} onSelect={() => {}} />}
      {visibleComponents.map((component) => <PlacedSymbol key={component.id} component={component} evaluatedProperties={symbolStates?.get(component.id)} indicatorLit={litIndicatorIds?.has(component.id)} draftingStyle={resolveDraftingStyle(component, document.draftingLayers)} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} onSelect={onSelect} onMove={lockedLayers.has(component.layerId ?? "") ? undefined : onMove} onMovePreview={updateMovePreview} previewDelta={previewMove?.ids.includes(component.id) ? previewMove.delta : undefined} wireMode={wireMode} onOpenContextMenu={onComponentContextMenu} terminalAnchorsForComponent={pinsByComponent.get(component.id) ?? []} />)}
      {(document.annotations ?? []).map((annotation) => <PlacedAnnotation key={annotation.id} annotation={annotation} selected={annotation.id === selectedAnnotationId} onSelect={onAnnotationSelect} onMove={onAnnotationMove} />)}
      {routeStart && draftBends && (wirePointer || wireBends.length > 0) && <path data-export-exclude="" data-wire-draft="" d={orthogonalWirePath(routeStart, previewTarget ?? wirePointer ?? wireBends.at(-1)!, draftBends, routeStart.vertical, previewTarget?.vertical ?? wirePointer?.vertical)} fill="none" stroke="#1976d2" strokeWidth="2" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      <g className="terminal-pin-markers" pointerEvents="none">{visibleAnchors.map((item) => <g key={endpointKey(item.endpoint)}><circle cx={item.x} cy={item.y} r="3" className="terminal-pin" vectorEffect="non-scaling-stroke" /><title>{endpointKey(item.endpoint)}</title></g>)}</g>
      {transformTarget && visibleIds.has(transformTarget.id) && !lockedLayers.has(transformTarget.layerId ?? "") && onComponentTransform && <ComponentTransformHandles key={transformTarget.id} component={transformed.components.find((item) => item.id === transformTarget.id)!} onPreview={(action) => setTransformPreview(action ? { id: transformTarget.id, action } : null)} onCommit={(action) => onComponentTransform(transformTarget.id, action)} />}
      {selectionBox && <rect className="selection-marquee" x={Math.min(selectionBox.x1, selectionBox.x2)} y={Math.min(selectionBox.y1, selectionBox.y2)} width={Math.abs(selectionBox.x2 - selectionBox.x1)} height={Math.abs(selectionBox.y2 - selectionBox.y1)} pointerEvents="none" />}
      <ProjectContinuationMarkers continuations={continuations} projectSheets={projectSheets} activeSheetId={activeSheetId} anchors={visibleAnchors} componentClearances={previewDocument.components.map(instanceFootprint)} onNavigate={onContinuationNavigate} selectedContinuationId={selectedContinuationId} onSelect={onContinuationSelect} />
      {(wireMode || (!onPlaceComponent && !placementDragging && !graphicMode && !annotationMode && !wireRouteEditId)) && <g className="terminal-anchors" data-export-exclude="">{visibleAnchors.map((item) => <TerminalHitTarget key={endpointKey(item.endpoint)} anchor={item} component={componentsById.get(item.endpoint.componentId)} radius={terminalHitRadius(item, pinsByComponent.get(item.endpoint.componentId) ?? [], zoom)} markerRadius={4} wireMode={wireMode} wireStart={wireStart} onSelect={onTerminalSelect} />)}</g>}
      </g>
      {placementPreviewDefinitionId && <ComponentPlacementPreview key={`${placementPreviewDefinitionId}:${Boolean(placementDragging)}`} document={document} definitionId={placementPreviewDefinitionId} resolvePoint={point => draftingPoint(point, false, true)} dragging={Boolean(placementDragging)} />}
    </svg>
    {freeView && <><DrawingRulers bounds={drawingBounds} zoom={zoom} onAddGuide={onAddGuide} /><output ref={cursorReadout} aria-label="Drawing cursor coordinates" aria-live="off" className="drawing-cursor-readout">X —  Y —  du</output></>}
  </div>;
}


function ProjectContinuationMarkers({ continuations = [], projectSheets = [], activeSheetId = "", anchors, componentClearances = [], onNavigate, selectedContinuationId = "", onSelect }: { continuations?: ProjectContinuation[]; projectSheets?: CircuitSheet[]; activeSheetId?: string; anchors: TerminalAnchor[]; componentClearances?: ReturnType<typeof instanceFootprint>[]; onNavigate?: (sheetId: string) => void; selectedContinuationId?: string; onSelect?: (continuationId: string) => void }) {
  const sheetNumbers = new Map(projectSheets.map((sheet, index) => [sheet.id, index + 1]));
  const anchorByEndpoint = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const stackByEndpoint = new Map<string, number>();
  const occupied = [...componentClearances];
  return <g className="project-continuation-markers" aria-label="Project sheet continuation references">{continuations.flatMap((continuation) => {
    const pointIndex = continuation.points.findIndex((item) => item.sheetId === activeSheetId);
    const point = continuation.points[pointIndex];
    const anchor = point && anchorByEndpoint.get(endpointKey(point.endpoint));
    if (!point || !anchor) return [];
    const key = endpointKey(point.endpoint);
    const stackIndex = stackByEndpoint.get(key) ?? 0;
    stackByEndpoint.set(key, stackIndex + 1);
    const previous = continuation.points[pointIndex - 1];
    const next = continuation.points[pointIndex + 1];
    const source = continuation.points[0];
    const sourceRef = `S${sheetNumbers.get(source.sheetId) ?? "?"} · ${source.gridReference}`;
    const target = next ?? previous;
    const formatReference = (reference: typeof point) => `S${sheetNumbers.get(reference.sheetId) ?? "?"} · ${reference.gridReference}`;
    const links = [
      previous && `← ${formatReference(previous)}`,
      next && `→ ${formatReference(next)}`,
      previous && previous !== source && `(src ${sourceRef})`,
    ].filter(Boolean).join(" ");
    const label = `${continuation.label} ${links}`;
    const width = Math.max(82, label.length * 6.1 + 12);
    const y = anchor.y - 12 - stackIndex * 22;
    const top = y - 15;
    const bottom = y + 3;
    let left = anchor.x + 9;
    for (const other of occupied.filter((box) => top < box.bottom + 4 && bottom + 4 > box.top).sort((a, b) => a.left - b.left)) {
      if (left + width + 4 <= other.left) break;
      if (left < other.right + 4) left = other.right + 4;
    }
    occupied.push({ left, right: left + width, top, bottom });
    const navigateTo = target?.sheetId;
    return [<g key={continuation.id + ":" + activeSheetId} className={continuation.id === selectedContinuationId ? "project-continuation-marker selected" : "project-continuation-marker"} transform={`translate(${left + 3} ${y})`} role={onSelect || (navigateTo && onNavigate) ? "button" : undefined} tabIndex={onSelect || (navigateTo && onNavigate) ? 0 : undefined} aria-label={`Wire ${continuation.label}, source ${sourceRef}, point on sheet ${sheetNumbers.get(activeSheetId) ?? "?"} at ${point.gridReference}`} onClick={(event) => { event.stopPropagation(); if (navigateTo) onNavigate?.(navigateTo); onSelect?.(continuation.id); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && (navigateTo || onSelect)) { event.preventDefault(); event.stopPropagation(); if (event.key === "Enter" && navigateTo) onNavigate?.(navigateTo); onSelect?.(continuation.id); } }}><rect x="-3" y="-15" width={width} height="18" rx="3" style={{ stroke: continuation.conductorColor }} /><text x="2" y="-3" fontFamily="monospace" style={{ fill: continuation.conductorColor }}>{label}</text><title>{`${continuation.label}: source ${sourceRef}; this point S${sheetNumbers.get(activeSheetId) ?? "?"} · ${point.gridReference}. Click or press Enter to follow. Press Space for properties.`}</title></g>];
  })}</g>;
}

export function Schematic({ document, symbolStates, onPlaceComponent, placementPreviewDefinitionId, placementDragging, litIndicatorIds, onComponentTransform, selectedComponentId, selectedComponentIds = [], selectedWireId, simulation, wireMode, wireStart, wireBends = [], onWireBend, onSelect, onGroupSelect, onWireSelect, onWireBranchStart, wireRouteEditId, onWireRouteChange, onTerminalSelect, onMove, onComponentDrop, zoom = .85, freeView, onAddGuide, showGrid = true, annotationMode = false, selectedAnnotationId = "", onAnnotationSelect, onAnnotationPlace, onAnnotationMove, graphicMode = null, selectedGraphicId = "", selectedGraphicIds, onGraphicSelect, onGraphicCreate, onGraphicMove, onGraphicResize, onGraphicVertexMove, onGraphicVertexInsert, onGraphicVertexDelete, continuations, projectSheets, activeSheetId, onContinuationNavigate, selectedContinuationId, onContinuationSelect, onComponentContextMenu }: Props) {
  const [wirePointer, setWirePointer] = useState<(SchematicGraphicPoint & { vertical?: boolean }) | null>(null);
  useEffect(() => { setWirePointer(null); }, [wireStart, document.id]);
  if (document.id !== "reference-dol-motor-starter") return <FreeSchematic document={document} symbolStates={symbolStates} onPlaceComponent={onPlaceComponent} placementPreviewDefinitionId={placementPreviewDefinitionId} placementDragging={placementDragging} litIndicatorIds={litIndicatorIds} onComponentTransform={onComponentTransform} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} selectedWireId={selectedWireId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} wireBends={wireBends} onWireBend={onWireBend} onSelect={onSelect} onGroupSelect={onGroupSelect} onWireSelect={onWireSelect} onWireBranchStart={onWireBranchStart} wireRouteEditId={wireRouteEditId} onWireRouteChange={onWireRouteChange} onTerminalSelect={onTerminalSelect} onMove={onMove} onComponentDrop={onComponentDrop} zoom={zoom} freeView={freeView} onAddGuide={onAddGuide} showGrid={showGrid} annotationMode={annotationMode} selectedAnnotationId={selectedAnnotationId} onAnnotationSelect={onAnnotationSelect} onAnnotationPlace={onAnnotationPlace} onAnnotationMove={onAnnotationMove} graphicMode={graphicMode} selectedGraphicId={selectedGraphicId} selectedGraphicIds={selectedGraphicIds} onGraphicSelect={onGraphicSelect} onGraphicCreate={onGraphicCreate} onGraphicMove={onGraphicMove} onGraphicResize={onGraphicResize} onGraphicVertexMove={onGraphicVertexMove} onGraphicVertexInsert={onGraphicVertexInsert} onGraphicVertexDelete={onGraphicVertexDelete} continuations={continuations} projectSheets={projectSheets} activeSheetId={activeSheetId} onContinuationNavigate={onContinuationNavigate} selectedContinuationId={selectedContinuationId} onContinuationSelect={onContinuationSelect} onComponentContextMenu={onComponentContextMenu} />;
  const references = new Map(document.components.map((component) => [component.id, component.reference]));
  const energized = simulation.breakerClosed && simulation.contactorEnergized && !simulation.overloadTripped;
  const switched = simulation.breakerClosed;
  const lineClass = (active: boolean) => active ? "wire energized" : "wire";
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const componentsById = new Map(document.components.map((component) => [component.id, component]));
  const routeStart = onWireBend && wireStart ? anchorIndex.get(endpointKey(wireStart)) : undefined;
  const manualWires = document.wires.filter((wire) => wire.id.startsWith("manual-wire-"));

  return <div className="schematic-wrap">
    <svg className="schematic" style={{ width: 1100 * zoom, height: 780 * zoom, minWidth: 0, minHeight: 0 }} viewBox="0 0 1100 780" role="group" aria-description="Focus a terminal and press Enter or Space to start or finish a wire." aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Direct-on-line motor starter power and control schematic"}
      onPointerMove={(event) => {
        if (!routeStart) return;
        const target = event.target instanceof Element ? event.target.closest("[data-wire-terminal]")?.getAttribute("data-wire-terminal") : null;
        const anchor = target && anchorIndex.get(target);
        const matrix = event.currentTarget.getScreenCTM();
        if (anchor) setWirePointer(anchor);
        else if (matrix) {
          const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
          setWirePointer({ x: snapDrawingCoordinate(point.x, 20), y: snapDrawingCoordinate(point.y, 20) });
        }
      }}
      onPointerLeave={() => setWirePointer(null)}
      onClickCapture={(event) => {
        if (!routeStart || !onWireBend || event.button !== 0 || !(event.target instanceof Element) || event.target.closest("[data-wire-terminal]")) return;
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        event.stopPropagation();
        onWireBend({ x: snapDrawingCoordinate(point.x, 20), y: snapDrawingCoordinate(point.y, 20) });
      }}>
      <style>{componentDraftingStyles}</style>
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" />{showGrid && <rect width="1100" height="780" fill="url(#grid)" pointerEvents="none" />}
      {manualWires.map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to, wire.points)} style={wireDraftingStyle(wire, document.draftingLayers)} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} onClick={(event) => { event.stopPropagation(); onWireSelect(wire.id); }} /> : null;
      })}
      <text x="65" y="43" className="drawing-title">POWER CIRCUIT — DIRECT-ON-LINE MOTOR STARTER</text>
      <text x="500" y="640" className="drawing-title control-title">CONTROL CIRCUIT — START / STOP / HOLD</text>

      {[{ x: 165, label: "L1", color: "phase-l1" }, { x: 255, label: "L2", color: "phase-l2" }, { x: 345, label: "L3", color: "phase-l3" }].map((phase) => <g key={phase.label}><text x={phase.x - 15} y="82" className="phase-label">{phase.label}</text><circle cx={phase.x} cy="100" r="7" className={phase.color} /><path d={`M ${phase.x} 107 V 146`} className={`wire ${phase.color}`} /></g>)}
      <text x="435" y="82" className="phase-label pe">PE</text><path d="M 445 100 V 540 H 390" className="wire pe-wire" />

      <g {...componentBox("breaker", selectedComponentId, onSelect, 120, 140, 280, 94)}>
        <g className="device"><text x="475" y="184" className="reference-label">{references.get("breaker") ?? "Q1"}</text><text x="475" y="205" className="device-label">3-pole breaker</text>
          {[165, 255, 345].map((x, index) => <g key={x}><text x={x - 7} y="168" textAnchor="end" className="terminal-label">{["1", "3", "5"][index]}</text><path d={`M ${x} 146 v 10 l 24 30`} className="contact-blade" /><path d={`M ${x} 197 V 252`} className={lineClass(switched)} /><text x={x + 7} y="240" className="terminal-label">{["2", "4", "6"][index]}</text></g>)}
          <path d="M 142 220 H 368" className="mechanical-link" />
        </g>
      </g>

      <g {...componentBox("contactor", selectedComponentId, onSelect, 120, 245, 280, 112)}>
        <g className="device"><text x="475" y="284" className="reference-label">{references.get("contactor") ?? "KM1"}</text><text x="475" y="305" className="device-label">main contactor</text>
          {[165, 255, 345].map((x, index) => <g key={x}><text x={x - 7} y="275" textAnchor="end" className="terminal-label">{["1/L1", "3/L2", "5/L3"][index]}</text><path d={`M ${x} 252 v 14 l 24 ${energized ? "0" : "32"}`} className={energized ? "contact-blade closed" : "contact-blade"} /><path d={`M ${x} 303 V 370`} className={lineClass(energized)} /><text x={x + 7} y="330" className="terminal-label">{["2/T1", "4/T2", "6/T3"][index]}</text></g>)}
          <path d="M 142 336 H 368" className="mechanical-link" />
        </g>
      </g>

      <g {...componentBox("overload", selectedComponentId, onSelect, 120, 365, 280, 104)}>
        <g className="device"><text x="475" y="405" className="reference-label">{references.get("overload") ?? "F1"}</text><text x="475" y="426" className="device-label">thermal overload</text>
          <g aria-label={`Three-phase thermal overload heater poles, ${simulation.overloadTripped ? "tripped" : "healthy"}`} data-state={simulation.overloadTripped ? "tripped" : "healthy"}>
            {[165, 255, 345].map((x, index) => <g key={x}><text x={x - 10} y="390" textAnchor="end" className="terminal-label overload-terminal-label">{["1", "3", "5"][index]}</text><path d={`M ${x} 370 V 373 l -6 4 l 12 6 l -12 6 l 12 6 l -6 3 V 401`} className={simulation.overloadTripped ? "overload tripped" : "overload"} /><path d={`M ${x} 401 V 415`} className={simulation.overloadTripped ? "wire fault" : lineClass(energized)} /><path d={`M ${x - 7} 415 H ${x + 7} M ${x - 7} 449 H ${x + 7}`} className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade"} /><path d={simulation.overloadTripped ? `M ${x} 415 L ${x + 9} 437` : `M ${x} 415 V 449`} className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade closed"} /><text x={x + 10} y="444" className="terminal-label overload-terminal-label">{["2", "4", "6"][index]}</text><path d={`M ${x} 449 V 516`} className={simulation.overloadTripped ? "wire fault overload-output" : lineClass(energized)} /><circle cx={x} cy="415" r="2" className="overload-contact-point" /><circle cx={x} cy="449" r="2" className="overload-contact-point" /></g>)}
          </g>
        </g>
      </g>

      <g {...componentBox("motor", selectedComponentId, onSelect, 100, 500, 370, 150)}>
        <g className="device"><circle cx="255" cy="572" r="58" className={simulation.motorState === "running" ? "motor running" : "motor"} /><text x="218" y="566" className="motor-mark">M</text><text x="220" y="590" className="motor-phase">3~</text><text x="430" y="562" className="reference-label">{references.get("motor") ?? "M1"}</text><text x="430" y="584" className="device-label">7.5 kW · 400 V</text>
          {[{ x: 165, label: "U1" }, { x: 255, label: "V1" }, { x: 345, label: "W1" }].map((terminal) => <text key={terminal.label} x={terminal.x - 13} y="507" className="terminal-label">{terminal.label}</text>)}<text x="405" y="540" className="terminal-label pe">PE</text>
        </g>
      </g>

      <g {...componentBox("control", selectedComponentId, onSelect, 100, 650, 115, 96)}>
        <g className="device"><text x="74" y="739" className="reference-label">{references.get("control") ?? "X2"}</text><text x="74" y="758" className="device-label">230 V control</text><path d="M 130 730 H 170" className={lineClass(simulation.breakerClosed)} /><text x="121" y="720" className="terminal-label">L</text><path d="M 130 765 H 840" className="wire neutral" /><text x="121" y="778" className="terminal-label">N</text></g>
      </g>
      <g {...componentBox("stop", selectedComponentId, onSelect, 170, 690, 140, 58)}><g className="device"><path d="M 170 730 H 195 M 245 730 H 280" className={lineClass(simulation.breakerClosed)} /><path d="M 195 730 L 245 710" className="contact-blade" /><text x="184" y="695" className="reference-label">{references.get("stop") ?? "S0"} STOP NC</text><text x="170" y="751" textAnchor="middle" className="terminal-label control-terminal-label" data-terminal="stop.21">21</text><text x="280" y="751" textAnchor="middle" className="terminal-label control-terminal-label" data-terminal="stop.22">22</text></g></g>
      <g {...componentBox("start", selectedComponentId, onSelect, 430, 690, 145, 58)}><g className="device"><path d="M 375 730 H 440 M 490 730 H 548" className={lineClass(simulation.breakerClosed && !simulation.overloadTripped)} /><path d="M 440 712 L 490 730" className={simulation.startPressed ? "contact-blade closed" : "contact-blade"} /><text x="433" y="695" className="reference-label">{references.get("start") ?? "S1"} START NO</text><text x="440" y="751" textAnchor="middle" className="terminal-label control-terminal-label" data-terminal="start.13">13</text><text x="548" y="751" textAnchor="middle" className="terminal-label control-terminal-label" data-terminal="start.14">14</text></g></g>
      <g {...componentBox("contactor", selectedComponentId, onSelect, 720, 680, 150, 92)}><g className="device"><path d="M 548 730 H 780" className={lineClass(simulation.contactorEnergized)} /><rect x="780" y="706" width="54" height="45" rx="4" className={simulation.contactorEnergized ? "coil energized" : "coil"} /><text x="789" y="734" className="coil-label">KM1</text><path d="M 834 730 H 860 V 765" className="wire neutral" /><text x="783" y="696" className="terminal-label">A1</text><text x="843" y="756" className="terminal-label">A2</text>
        <path d="M 375 730 V 665 H 610 V 730" className={simulation.contactorEnergized ? "wire energized" : "wire"} /><path d="M 525 665 L 575 665" className={simulation.contactorEnergized ? "contact-blade closed" : "contact-blade"} /><text x="493" y="654" className="reference-label small">KM1 13–14 HOLD</text>
        <path d="M 310 730 H 375" className={simulation.overloadTripped ? "wire fault" : lineClass(simulation.breakerClosed)} /><path d="M 330 720 L 355 740" className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade closed"} /><text x="302" y="695" className="reference-label">F1 95–96</text>
      </g></g>

      {document.components.filter((component) => !staticComponentIds.has(component.id)).map((component) => <PlacedSymbol key={component.id} component={component} evaluatedProperties={symbolStates?.get(component.id)} indicatorLit={litIndicatorIds?.has(component.id)} draftingStyle={resolveDraftingStyle(component, document.draftingLayers)} selectedComponentId={selectedComponentId} onSelect={onSelect} terminalAnchorsForComponent={anchors.filter((anchor) => anchor.endpoint.componentId === component.id)} />)}
      {routeStart && (wirePointer || wireBends.length > 0) && <path data-export-exclude="" data-wire-draft="" d={orthogonalWirePath(routeStart, wirePointer ?? wireBends.at(-1)!, wireBends, routeStart.vertical, wirePointer?.vertical)} fill="none" stroke="#1976d2" strokeWidth="2" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      <g className="terminal-pin-markers" pointerEvents="none">{anchors.map((item) => <g key={endpointKey(item.endpoint)}><circle cx={item.x} cy={item.y} r="5" className="terminal-pin" /><title>{endpointKey(item.endpoint)}</title></g>)}</g>
      {(wireMode || (!onPlaceComponent && !placementDragging && !graphicMode && !annotationMode && !wireRouteEditId)) && <g className="terminal-anchors" data-export-exclude="">{anchors.map((item) => <TerminalHitTarget key={endpointKey(item.endpoint)} anchor={item} component={componentsById.get(item.endpoint.componentId)} radius={7} markerRadius={7} wireMode={wireMode} wireStart={wireStart} onSelect={onTerminalSelect} />)}</g>}
      <ProjectContinuationMarkers continuations={continuations} projectSheets={projectSheets} activeSheetId={activeSheetId} anchors={anchors} onNavigate={onContinuationNavigate} selectedContinuationId={selectedContinuationId} onSelect={onContinuationSelect} />
    </svg>
  </div>;
}



