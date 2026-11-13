import type { CircuitDocument, SchematicAnnotation, SchematicGraphic, SchematicGraphicKind, SchematicGraphicPoint } from "../types/electrical";
import type { DolSimulationState } from "../simulation/dolSimulator";
import type { TerminalEndpoint } from "../types/electrical";
import { catalogById } from "../catalog/dolCatalog";
import { componentsInMarquee } from "../cad/componentSelection";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "./functionalSymbols";
import { componentLabelOffsets, controlTerminalOffset, powerTerminalOffset } from "../cad/componentGeometry";
import { orthogonalWirePath } from "../cad/wirePath";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

interface Props {
  onMove?: (componentId: string, x: number, y: number) => void;
  zoom?: number;
  showGrid?: boolean;
  document: CircuitDocument;
  selectedComponentId: string;
  selectedComponentIds?: string[];
  selectedWireId: string;
  simulation: DolSimulationState;
  wireMode: boolean;
  wireStart: TerminalEndpoint | null;
  onSelect: (componentId: string, additive?: boolean) => void;
  onGroupSelect?: (componentIds: string[], additive: boolean) => void;
  onWireSelect: (wireId: string) => void;
  onTerminalSelect: (endpoint: TerminalEndpoint, continueBranch?: boolean) => void;
  annotationMode?: boolean;
  selectedAnnotationId?: string;
  onAnnotationSelect?: (id: string) => void;
  onAnnotationPlace?: (x: number, y: number) => void;
  onAnnotationMove?: (id: string, x: number, y: number) => void;
  graphicMode?: SchematicGraphicKind | null;
  selectedGraphicId?: string;
  onGraphicSelect?: (id: string) => void;
  onGraphicCreate?: (kind: SchematicGraphicKind, x1: number, y1: number, x2: number, y2: number, points?: SchematicGraphicPoint[]) => void;
  onGraphicMove?: (id: string, dx: number, dy: number) => void;
  onGraphicResize?: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
  onGraphicVertexMove?: (id: string, index: number, x: number, y: number) => void;
  onGraphicVertexInsert?: (id: string, x: number, y: number) => void;
  onGraphicVertexDelete?: (id: string, index: number) => void;
}

interface TerminalAnchor {
  endpoint: TerminalEndpoint;
  x: number;
  y: number;
  power?: boolean;
  vertical?: boolean;
}

const staticComponentIds = new Set(["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"]);
const endpointKey = (endpoint: TerminalEndpoint) => `${endpoint.componentId}.${endpoint.terminalId}`;
const isSameEndpoint = (left: TerminalEndpoint | null, right: TerminalEndpoint) => Boolean(left && left.componentId === right.componentId && left.terminalId === right.terminalId);

export function terminalAnchors(document: CircuitDocument): TerminalAnchor[] {
  const anchors: TerminalAnchor[] = document.id === "reference-dol-motor-starter" ? [
    anchor("supply", "l1", 165, 100), anchor("supply", "l2", 255, 100), anchor("supply", "l3", 345, 100), anchor("supply", "pe", 445, 100),
    anchor("breaker", "l1-in", 165, 146), anchor("breaker", "l2-in", 255, 146), anchor("breaker", "l3-in", 345, 146), anchor("breaker", "l1-out", 165, 252), anchor("breaker", "l2-out", 255, 252), anchor("breaker", "l3-out", 345, 252),
    anchor("contactor", "l1-in", 165, 252), anchor("contactor", "l2-in", 255, 252), anchor("contactor", "l3-in", 345, 252), anchor("contactor", "l1-out", 165, 303), anchor("contactor", "l2-out", 255, 303), anchor("contactor", "l3-out", 345, 303), anchor("contactor", "a1", 780, 730), anchor("contactor", "a2", 834, 730), anchor("contactor", "aux-13", 375, 665), anchor("contactor", "aux-14", 610, 665),
    anchor("overload", "l1-in", 165, 370), anchor("overload", "l2-in", 255, 370), anchor("overload", "l3-in", 345, 370), anchor("overload", "t1", 165, 449), anchor("overload", "t2", 255, 449), anchor("overload", "t3", 345, 449), anchor("overload", "aux-95", 310, 730), anchor("overload", "aux-96", 375, 730),
    anchor("motor", "u1", 165, 516), anchor("motor", "v1", 255, 516), anchor("motor", "w1", 345, 516), anchor("motor", "pe", 445, 540),
    anchor("control", "line", 130, 730), anchor("control", "neutral", 130, 765), anchor("stop", "21", 170, 730), anchor("stop", "22", 280, 730), anchor("start", "13", 440, 730), anchor("start", "14", 548, 730),
  ] : [];
  for (const component of document.components.filter((item) => document.id !== "reference-dol-motor-starter" || !staticComponentIds.has(item.id))) {
    const definition = catalogById.get(component.definitionId);
    definition?.terminals.forEach((terminal, index) => {
      const sixTerminal = definition.id === "motor.six-terminal";
      const x = sixTerminal ? index < 6 ? [-30, 0, 30][index % 3] : -47 : index % 2 ? 32 : -32;
      const y = sixTerminal ? index < 3 ? -42 : index < 6 ? 42 : 0 : -15 + Math.floor(index / 2) * 12;
      const statefulProtection = ["catalog-circuit-breaker", "breaker-3p-v1", "thermal-overload-dol-v1"].includes(definition.simulationModelId);
      const power = statefulProtection || component.properties.powerLayout === "vertical" ? powerTerminalOffset(definition.simulationModelId, terminal.id) : undefined;
      const control = power ?? controlTerminalOffset(definition.simulationModelId, terminal.id);
      const size = component.size ?? 1;
      const offset = rotateOffset((control?.x ?? x) * size, (control?.y ?? y) * size, component.rotation);
      anchors.push({ ...anchor(component.id, terminal.id, component.x + offset.x, component.y + offset.y), power: terminal.kind === "power", vertical: Boolean(power && terminal.kind === "power" && component.rotation % 180 === 0) });
    });
  }
  return anchors;
}

function rotateOffset(x: number, y: number, rotation: 0 | 90 | 180 | 270): { x: number; y: number } {
  if (rotation === 90) return { x: -y, y: x };
  if (rotation === 180) return { x: -x, y: -y };
  if (rotation === 270) return { x: y, y: -x };
  return { x, y };
}

function anchor(componentId: string, terminalId: string, x: number, y: number): TerminalAnchor {
  return { endpoint: { componentId, terminalId }, x, y };
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
  return <g transform={`translate(${annotation.x} ${annotation.y}) rotate(${annotation.rotation ?? 0})`} onClick={(event) => { event.stopPropagation(); onSelect(annotation.id); }} onPointerDown={(event) => {
    if (!onMove || event.button !== 0) return;
    event.stopPropagation(); onSelect(annotation.id); origin.current = point(event) ?? null;
    if (origin.current) event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerUp={(event) => {
    const start = origin.current; const current = point(event); origin.current = null;
    if (start && current && Math.hypot(current.x - start.x, current.y - start.y) > 4) onMove?.(annotation.id, annotation.x + current.x - start.x, annotation.y + current.y - start.y);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }} style={{ cursor: onMove ? "move" : "pointer", touchAction: "none" }}>
    {annotation.backgroundColor && <rect x={outlineX} y={-size * 1.1} width={width} height={height} rx="2" fill={annotation.backgroundColor} />}
    {selected && <rect x={outlineX} y={-size * 1.1} width={width} height={height} rx="3" fill="none" stroke="#e0a526" strokeDasharray="4 3" />}
    <text x="0" y="0" textAnchor={textAnchor} fill={annotation.color} fontSize={size} fontWeight={annotation.fontWeight ?? 600} fontStyle={annotation.fontStyle ?? "normal"} paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3" strokeLinejoin="round">{lines.map((line, index) => <tspan key={index} x="0" dy={index === 0 ? 0 : size * lineSpacing}>{line || " "}</tspan>)}</text>
  </g>;
}

function PlacedGraphic({ graphic, selected, onSelect, onMove, onResize, onVertexMove, onVertexInsert, onVertexDelete }: { graphic: SchematicGraphic; selected: boolean; onSelect: (id: string) => void; onMove?: Props["onGraphicMove"]; onResize?: Props["onGraphicResize"]; onVertexMove?: Props["onGraphicVertexMove"]; onVertexInsert?: Props["onGraphicVertexInsert"]; onVertexDelete?: Props["onGraphicVertexDelete"] }) {
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
  return <g data-graphic-id={graphic.id} data-graphic-kind={graphic.kind} onClick={(event) => { event.stopPropagation(); onSelect(graphic.id); }} onDoubleClick={(event) => { if (!graphic.points || !onVertexInsert) return; event.stopPropagation(); const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM(); const current = matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null; if (current) onVertexInsert(graphic.id, current.x, current.y); }} onPointerDown={(event) => {
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
        const snappedX = Math.max(0, Math.min(1100, Math.round(current.x / 20) * 20));
        const snappedY = Math.max(0, Math.min(780, Math.round(current.y / 20) * 20));
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
    <text x={x + width / 2} y={y + height + 17 > 780 ? Math.max(14, y - 7) : y + height + 17} textAnchor="middle" fontSize="11" fontWeight="700" fill={graphic.color} paintOrder="stroke" stroke="#f4f8fc" strokeWidth="3" pointerEvents="none" textLength={graphic.name.length > 16 ? 150 : undefined} lengthAdjust="spacingAndGlyphs">{graphic.name}</text>
    <title>{`${graphic.name} · drafting geometry; not an electrical connection`}</title>
  </g>;
}

const componentBox = (id: string, selected: string, onSelect: (componentId: string) => void, x: number, y: number, width: number, height: number) => ({
  onClick: () => onSelect(id),
  className: id === selected ? "schematic-component selected" : "schematic-component",
  children: <rect x={x} y={y} width={width} height={height} rx="6" className="selection-boundary" />,
});

function SixTerminalWindings({ x, y }: { x: number; y: number }) {
  return <g aria-label="Three-phase induction motor with six accessible winding terminals U1 V1 W1 U2 V2 W2">
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

function PlacedSymbol({ component, selectedComponentId, selectedComponentIds = [], onSelect, onMove, wireMode, terminalAnchorsForComponent }: { component: CircuitDocument["components"][number]; selectedComponentId: string; selectedComponentIds?: string[]; onSelect: Props["onSelect"]; onMove?: Props["onMove"]; wireMode?: boolean; terminalAnchorsForComponent: TerminalAnchor[] }) {
  const definition = catalogById.get(component.definitionId);
  const labels = componentLabelOffsets(component.rotation, component.definitionId);
  const typeLabel = typeof component.properties.indication === "string" && component.properties.indication.trim() ? component.properties.indication.trim() : definition?.referencePrefix ?? "?";
  const displayLabel = component.displayName?.trim() ? `${component.displayName.trim()} · ${typeLabel}`.slice(0, 32) : typeLabel.slice(0, 24);
  const symbolProperties = { ...component.properties };
  definition?.terminals.forEach((terminal, index) => { const label = component.terminalLabels?.[terminal.id]; if (label) symbolProperties["terminalLabel" + (index + 1)] = label; });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  return <g onClick={(event) => { event.stopPropagation(); if (dragged.current) { dragged.current = false; return; } onSelect(component.id, event.shiftKey); }} transform={`translate(${delta.x} ${delta.y})`} style={{ touchAction: wireMode ? "auto" : "none", cursor: onMove && !wireMode ? "grab" : undefined }}
    onPointerDown={(event) => {
      if (!onMove || wireMode || event.button !== 0) return;
      const start = point(event); if (!start) return;
      event.stopPropagation(); if (!event.shiftKey && !selectedComponentIds.includes(component.id)) onSelect(component.id); origin.current = { x: start.x, y: start.y }; dragged.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = point(event); if (!origin.current || !current) return;
      setDelta({ x: Math.round((current.x - origin.current.x) / 20) * 20, y: Math.round((current.y - origin.current.y) / 20) * 20 });
    }}
    onPointerUp={(event) => {
      const current = point(event); const start = origin.current;
      origin.current = null; setDelta({ x: 0, y: 0 });
      if (start && current && Math.hypot(current.x - start.x, current.y - start.y) > 4) { dragged.current = true; onMove?.(component.id, component.x + current.x - start.x, component.y + current.y - start.y); }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { origin.current = null; setDelta({ x: 0, y: 0 }); }}
    onLostPointerCapture={() => { origin.current = null; setDelta({ x: 0, y: 0 }); }}
    className={(selectedComponentIds.length ? selectedComponentIds.includes(component.id) : component.id === selectedComponentId) ? "schematic-component selected" : "schematic-component"}>
    <g transform={`translate(${component.x} ${component.y}) scale(${component.size ?? 1}) translate(${-component.x} ${-component.y})`}><g transform={`rotate(${component.rotation} ${component.x} ${component.y})`} style={component.draftingColor ? { "--component-ink": component.draftingColor } as CSSProperties : undefined}><rect x={component.x - 55} y={component.y - 35} width="110" height="70" rx="6" className="selection-boundary" /><rect x={component.x - 47} y={component.y - 27} width="94" height="54" rx="4" className="free-symbol" />{definition?.id === "motor.six-terminal" ? <SixTerminalWindings x={component.x} y={component.y} /> : <>{definition && <FunctionalSymbol symbolId={definition.symbolId} x={component.x} y={component.y} properties={symbolProperties} />}{definition && !hasDedicatedFunctionalSymbol(definition.symbolId) && <GenericSymbol symbolId={definition.symbolId} x={component.x} y={component.y} />}</>}</g>
    {definition?.symbolId !== "user-indicator-lamp" && terminalAnchorsForComponent.map(({ endpoint, x, y }) => { const label = component.terminalLabels?.[endpoint.terminalId]; if (!label) return null; const left = x < component.x; return <text key={endpoint.terminalId} x={x + (left ? -5 : 5)} y={y + (y < component.y ? -5 : 12)} textAnchor={left ? "end" : "start"} className="terminal-label custom-terminal-label">{label}</text>; })} <text x={component.x} y={component.y + labels.reference} className="free-reference" textAnchor="middle" textLength={component.reference.length > 6 ? 78 : undefined} lengthAdjust="spacingAndGlyphs" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="4" strokeLinejoin="round">{component.reference}</text>
    <text x={component.x} y={component.y + labels.kind} className="free-kind" textAnchor="middle" textLength={displayLabel.length > 12 ? 78 : undefined} lengthAdjust="spacingAndGlyphs">{displayLabel}</text></g>
  </g>;
}

function GenericSymbol({ symbolId, x, y }: { symbolId: string; x: number; y: number }) {
  if (symbolId.startsWith("motor-ac-") || /^motor-\d+$/.test(symbolId) || symbolId === "motor-3phase") return <g className="generic-symbol-mark"><circle cx={x} cy={y} r="20" /><text x={x} y={y - 2} textAnchor="middle" className="functional-symbol-text">M</text><text x={x} y={y + 12} textAnchor="middle" className="functional-symbol-text">3~</text></g>;
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

function FreeSchematic({ document, selectedComponentId, selectedComponentIds = [], selectedWireId, wireMode, wireStart, onSelect, onGroupSelect, onWireSelect, onTerminalSelect, onMove, zoom = .85, showGrid = true, annotationMode = false, selectedAnnotationId = "", onAnnotationSelect = () => {}, onAnnotationPlace = () => {}, onAnnotationMove, graphicMode = null, selectedGraphicId = "", onGraphicSelect = () => {}, onGraphicCreate = () => {}, onGraphicMove, onGraphicResize, onGraphicVertexMove, onGraphicVertexInsert, onGraphicVertexDelete }: Props) {
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const graphicStart = useRef<{ x: number; y: number } | null>(null);
  const selectionGesture = useRef<{ x: number; y: number; additive: boolean; moved: boolean } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const pathVertices = useRef<SchematicGraphicPoint[]>([]);
  const [graphicPreview, setGraphicPreview] = useState<{ kind: SchematicGraphicKind; x1: number; y1: number; x2: number; y2: number; points?: SchematicGraphicPoint[] } | null>(null);
  const isPathMode = graphicMode === "polyline" || graphicMode === "polygon";
  useEffect(() => { pathVertices.current = []; setGraphicPreview(null); }, [graphicMode]);
  const graphicPoint = (event: PointerEvent<SVGRectElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const grid = (value: number) => Math.max(0, Math.min(1100, Math.round(value / 20) * 20));
  const svgPoint = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const snappedPathPoint = (x: number, y: number) => ({ x: grid(x), y: Math.max(0, Math.min(780, Math.round(y / 20) * 20)) });
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
    const start = { x: grid(point.x), y: Math.max(0, Math.min(780, Math.round(point.y / 20) * 20)) };
    setGraphicPreview({ kind: graphicMode, x1: start.x, y1: start.y, x2: start.x, y2: start.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drawMove = (event: PointerEvent<SVGRectElement>) => {
    if (!graphicStart.current || !graphicMode) return;
    const point = graphicPoint(event); if (!point) return;
    setGraphicPreview((preview) => preview ? { ...preview, x2: grid(point.x), y2: Math.max(0, Math.min(780, Math.round(point.y / 20) * 20)) } : null);
  };
  const drawEnd = (event: PointerEvent<SVGRectElement>) => {
    const point = graphicPoint(event); const start = graphicStart.current; const kind = graphicMode;
    graphicStart.current = null; setGraphicPreview(null);
    if (start && point && kind) {
      const x1 = grid(start.x); const y1 = Math.max(0, Math.min(780, Math.round(start.y / 20) * 20));
      const x2 = grid(point.x); const y2 = Math.max(0, Math.min(780, Math.round(point.y / 20) * 20));
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
      if (start.moved) onGroupSelect?.(componentsInMarquee(document.components, start.x, start.y, point.x, point.y), start.additive);
      else if (!start.additive) onGroupSelect?.([], false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div className="schematic-wrap">
    <svg className="schematic" tabIndex={0} style={{ width: 1100 * zoom, height: 780 * zoom, minWidth: 0, minHeight: 0, cursor: annotationMode || graphicMode ? "crosshair" : undefined }} viewBox="0 0 1100 780" role={wireMode ? "group" : "img"} aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Free electrical schematic sheet"} onPointerDownCapture={(event) => { if (isPathMode) { event.stopPropagation(); addPathVertex(event); event.currentTarget.focus(); } }} onPointerMoveCapture={(event) => { if (isPathMode) { event.stopPropagation(); previewPathVertex(event); } }} onDoubleClickCapture={(event) => { if (isPathMode) { event.stopPropagation(); finishPath(); } }} onKeyDown={(event) => { if (isPathMode && event.key === "Enter") { event.preventDefault(); finishPath(); } else if (isPathMode && event.key === "Escape") { event.preventDefault(); pathVertices.current = []; setGraphicPreview(null); } }} onClick={(event) => {
      if (!annotationMode) return;
      const matrix = event.currentTarget.getScreenCTM();
      if (matrix) { const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); onAnnotationPlace(Math.max(0, Math.min(1100, Math.round(point.x / 20) * 20)), Math.max(0, Math.min(780, Math.round(point.y / 20) * 20))); }
    }}>
      <defs><pattern id="free-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" onPointerDown={(event) => graphicMode ? drawStart(event) : selectionStart(event)} onPointerMove={(event) => graphicMode ? drawMove(event) : selectionMove(event)} onPointerUp={(event) => graphicMode ? drawEnd(event) : selectionEnd(event)} onPointerCancel={() => { graphicStart.current = null; setGraphicPreview(null); selectionGesture.current = null; setSelectionBox(null); }} />{showGrid && <rect width="1100" height="780" fill="url(#free-grid)" pointerEvents="none" />}
      <text x="65" y="55" className="drawing-title">FREE ELECTRICAL SCHEMATIC SHEET</text>
      <text x="65" y="80" className="sheet-note">Insert catalog components, wire compatible terminals and move placed symbols on the grid.</text>
      {isPathMode && <text x="65" y="105" className="sheet-note" pointerEvents="none">Click vertices · double-click or Enter to finish · Escape cancels</text>}
      {document.wires.map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to, wire.points)} style={wire.draftingColor ? { stroke: wire.draftingColor } : undefined} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} onClick={(event) => { event.stopPropagation(); onWireSelect(wire.id); }} /> : null;
      })}
      {(document.graphics ?? []).map((graphic) => <PlacedGraphic key={graphic.id} graphic={graphic} selected={graphic.id === selectedGraphicId} onSelect={onGraphicSelect} onMove={onGraphicMove} onResize={onGraphicResize} onVertexMove={onGraphicVertexMove} onVertexInsert={onGraphicVertexInsert} onVertexDelete={onGraphicVertexDelete} />)}
      {graphicPreview && <PlacedGraphic graphic={{ id: "__preview__", name: "Drawing preview", color: "#1565c0", strokeWidth: 2, ...graphicPreview }} selected={false} onSelect={() => {}} />}
      {document.components.map((component) => <PlacedSymbol key={component.id} component={component} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} onSelect={onSelect} onMove={onMove} wireMode={wireMode} terminalAnchorsForComponent={anchors.filter((anchor) => anchor.endpoint.componentId === component.id)} />)}
      {(document.annotations ?? []).map((annotation) => <PlacedAnnotation key={annotation.id} annotation={annotation} selected={annotation.id === selectedAnnotationId} onSelect={onAnnotationSelect} onMove={onAnnotationMove} />)}
      {document.components.length === 0 && <text x="550" y="410" className="empty-sheet" textAnchor="middle">Select a catalog model and choose Insert to begin this sheet.</text>}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}; Shift-click a target to keep branching from the active source`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint, event.shiftKey); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint, event.shiftKey); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)} · Shift-click target to continue branch</title></g>)}</g>}
      {selectionBox && <rect className="selection-marquee" x={Math.min(selectionBox.x1, selectionBox.x2)} y={Math.min(selectionBox.y1, selectionBox.y2)} width={Math.abs(selectionBox.x2 - selectionBox.x1)} height={Math.abs(selectionBox.y2 - selectionBox.y1)} pointerEvents="none" />}
    </svg>
  </div>;
}

export function Schematic({ document, selectedComponentId, selectedComponentIds = [], selectedWireId, simulation, wireMode, wireStart, onSelect, onGroupSelect, onWireSelect, onTerminalSelect, onMove, zoom = .85, showGrid = true, annotationMode = false, selectedAnnotationId = "", onAnnotationSelect, onAnnotationPlace, onAnnotationMove, graphicMode = null, selectedGraphicId = "", onGraphicSelect, onGraphicCreate, onGraphicMove, onGraphicResize, onGraphicVertexMove, onGraphicVertexInsert, onGraphicVertexDelete }: Props) {
  if (document.id !== "reference-dol-motor-starter") return <FreeSchematic document={document} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} selectedWireId={selectedWireId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={onSelect} onGroupSelect={onGroupSelect} onWireSelect={onWireSelect} onTerminalSelect={onTerminalSelect} onMove={onMove} zoom={zoom} showGrid={showGrid} annotationMode={annotationMode} selectedAnnotationId={selectedAnnotationId} onAnnotationSelect={onAnnotationSelect} onAnnotationPlace={onAnnotationPlace} onAnnotationMove={onAnnotationMove} graphicMode={graphicMode} selectedGraphicId={selectedGraphicId} onGraphicSelect={onGraphicSelect} onGraphicCreate={onGraphicCreate} onGraphicMove={onGraphicMove} onGraphicResize={onGraphicResize} onGraphicVertexMove={onGraphicVertexMove} onGraphicVertexInsert={onGraphicVertexInsert} onGraphicVertexDelete={onGraphicVertexDelete} />;
  const references = new Map(document.components.map((component) => [component.id, component.reference]));
  const energized = simulation.breakerClosed && simulation.contactorEnergized && !simulation.overloadTripped;
  const switched = simulation.breakerClosed;
  const lineClass = (active: boolean) => active ? "wire energized" : "wire";
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const manualWires = document.wires.filter((wire) => wire.id.startsWith("manual-wire-"));

  return <div className="schematic-wrap">
    <svg className="schematic" style={{ width: 1100 * zoom, height: 780 * zoom, minWidth: 0, minHeight: 0 }} viewBox="0 0 1100 780" role={wireMode ? "group" : "img"} aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Direct-on-line motor starter power and control schematic"}>
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" />{showGrid && <rect width="1100" height="780" fill="url(#grid)" />}
      {manualWires.map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to, wire.points)} style={wire.draftingColor ? { stroke: wire.draftingColor } : undefined} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} onClick={(event) => { event.stopPropagation(); onWireSelect(wire.id); }} /> : null;
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

      {document.components.filter((component) => !staticComponentIds.has(component.id)).map((component) => <PlacedSymbol key={component.id} component={component} selectedComponentId={selectedComponentId} onSelect={onSelect} terminalAnchorsForComponent={anchors.filter((anchor) => anchor.endpoint.componentId === component.id)} />)}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}; Shift-click a target to keep branching from the active source`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint, event.shiftKey); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint, event.shiftKey); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)} · Shift-click target to continue branch</title></g>)}</g>}
    </svg>
  </div>;
}



