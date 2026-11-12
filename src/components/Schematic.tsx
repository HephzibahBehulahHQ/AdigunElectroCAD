import type { CircuitDocument } from "../types/electrical";
import type { DolSimulationState } from "../simulation/dolSimulator";
import type { TerminalEndpoint } from "../types/electrical";
import { catalogById } from "../catalog/dolCatalog";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "./functionalSymbols";
import { componentLabelOffsets, controlTerminalOffset, powerTerminalOffset } from "../cad/componentGeometry";
import { orthogonalWirePath } from "../cad/wirePath";
import { useRef, useState, type PointerEvent } from "react";

interface Props {
  onMove?: (componentId: string, x: number, y: number) => void;
  zoom?: number;
  showGrid?: boolean;
  document: CircuitDocument;
  selectedComponentId: string;
  selectedWireId: string;
  simulation: DolSimulationState;
  wireMode: boolean;
  wireStart: TerminalEndpoint | null;
  onSelect: (componentId: string) => void;
  onWireSelect: (wireId: string) => void;
  onTerminalSelect: (endpoint: TerminalEndpoint) => void;
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
      const offset = rotateOffset(control?.x ?? x, control?.y ?? y, component.rotation);
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

function PlacedSymbol({ component, selectedComponentId, onSelect, onMove, wireMode }: { component: CircuitDocument["components"][number]; selectedComponentId: string; onSelect: (componentId: string) => void; onMove?: Props["onMove"]; wireMode?: boolean }) {
  const definition = catalogById.get(component.definitionId);
  const labels = componentLabelOffsets(component.rotation, component.definitionId);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  return <g onClick={() => onSelect(component.id)} transform={`translate(${delta.x} ${delta.y})`} style={{ touchAction: wireMode ? "auto" : "none", cursor: onMove && !wireMode ? "grab" : undefined }}
    onPointerDown={(event) => {
      if (!onMove || wireMode || event.button !== 0) return;
      const start = point(event); if (!start) return;
      event.stopPropagation(); onSelect(component.id); origin.current = { x: start.x, y: start.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = point(event); if (!origin.current || !current) return;
      setDelta({ x: Math.round((current.x - origin.current.x) / 20) * 20, y: Math.round((current.y - origin.current.y) / 20) * 20 });
    }}
    onPointerUp={(event) => {
      const current = point(event); const start = origin.current;
      origin.current = null; setDelta({ x: 0, y: 0 });
      if (start && current && Math.hypot(current.x - start.x, current.y - start.y) > 4) onMove?.(component.id, component.x + current.x - start.x, component.y + current.y - start.y);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { origin.current = null; setDelta({ x: 0, y: 0 }); }}
    onLostPointerCapture={() => { origin.current = null; setDelta({ x: 0, y: 0 }); }}
    className={component.id === selectedComponentId ? "schematic-component selected" : "schematic-component"}>
    <g transform={`rotate(${component.rotation} ${component.x} ${component.y})`}><rect x={component.x - 55} y={component.y - 35} width="110" height="70" rx="6" className="selection-boundary" /><rect x={component.x - 47} y={component.y - 27} width="94" height="54" rx="4" className="free-symbol" />{definition?.id === "motor.six-terminal" ? <SixTerminalWindings x={component.x} y={component.y} /> : <>{definition && <FunctionalSymbol symbolId={definition.symbolId} x={component.x} y={component.y} properties={component.properties} />}{definition && !hasDedicatedFunctionalSymbol(definition.symbolId) && <GenericSymbol symbolId={definition.symbolId} x={component.x} y={component.y} />}</>}</g>
    <text x={component.x} y={component.y + labels.reference} className="free-reference" textAnchor="middle" textLength={component.reference.length > 6 ? 78 : undefined} lengthAdjust="spacingAndGlyphs" paintOrder="stroke" stroke="#f4f8fc" strokeWidth="4" strokeLinejoin="round">{component.reference}</text>
    <text x={component.x} y={component.y + labels.kind} className="free-kind" textAnchor="middle">{definition?.referencePrefix ?? "?"}</text>
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

function FreeSchematic({ document, selectedComponentId, selectedWireId, wireMode, wireStart, onSelect, onWireSelect, onTerminalSelect, onMove, zoom = .85, showGrid = true }: Props) {
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));

  return <div className="schematic-wrap">
    <svg className="schematic" style={{ width: 1100 * zoom, height: 780 * zoom, minWidth: 0, minHeight: 0 }} viewBox="0 0 1100 780" role={wireMode ? "group" : "img"} aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Free electrical schematic sheet"}>
      <defs><pattern id="free-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" />{showGrid && <rect width="1100" height="780" fill="url(#free-grid)" />}
      <text x="65" y="55" className="drawing-title">FREE ELECTRICAL SCHEMATIC SHEET</text>
      <text x="65" y="80" className="sheet-note">Insert catalog components, wire compatible terminals and move placed symbols on the grid.</text>
      {document.wires.map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to, wire.points)} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} onClick={(event) => { event.stopPropagation(); onWireSelect(wire.id); }} /> : null;
      })}
      {document.components.map((component) => <PlacedSymbol key={component.id} component={component} selectedComponentId={selectedComponentId} onSelect={onSelect} onMove={onMove} wireMode={wireMode} />)}
      {document.components.length === 0 && <text x="550" y="410" className="empty-sheet" textAnchor="middle">Select a catalog model and choose Insert to begin this sheet.</text>}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)}</title></g>)}</g>}
    </svg>
  </div>;
}

export function Schematic({ document, selectedComponentId, selectedWireId, simulation, wireMode, wireStart, onSelect, onWireSelect, onTerminalSelect, onMove, zoom = .85, showGrid = true }: Props) {
  if (document.id !== "reference-dol-motor-starter") return <FreeSchematic document={document} selectedComponentId={selectedComponentId} selectedWireId={selectedWireId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={onSelect} onWireSelect={onWireSelect} onTerminalSelect={onTerminalSelect} onMove={onMove} zoom={zoom} showGrid={showGrid} />;
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
        return from && to ? <path key={wire.id} d={wirePath(from, to, wire.points)} className={`wire manual-wire${from.power && to.power ? " power-wire" : ""}${wire.id === selectedWireId ? " selected-wire" : ""}`} onClick={(event) => { event.stopPropagation(); onWireSelect(wire.id); }} /> : null;
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
            {[165, 255, 345].map((x) => <g key={x}><path d={`M ${x} 370 V 373 l -6 4 l 12 6 l -12 6 l 12 6 l -6 3 V 401`} className={simulation.overloadTripped ? "overload tripped" : "overload"} /><path d={`M ${x} 401 V 415`} className={simulation.overloadTripped ? "wire fault" : lineClass(energized)} /><path d={`M ${x - 7} 415 H ${x + 7} M ${x - 7} 449 H ${x + 7}`} className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade"} /><path d={simulation.overloadTripped ? `M ${x} 415 L ${x + 9} 437` : `M ${x} 415 V 449`} className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade closed"} /><path d={`M ${x} 449 V 516`} className={simulation.overloadTripped ? "wire fault overload-output" : lineClass(energized)} /><circle cx={x} cy="415" r="2" className="overload-contact-point" /><circle cx={x} cy="449" r="2" className="overload-contact-point" /></g>)}
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
      <g {...componentBox("stop", selectedComponentId, onSelect, 170, 690, 140, 58)}><g className="device"><path d="M 170 730 H 195 M 245 730 H 280" className={lineClass(simulation.breakerClosed)} /><path d="M 195 730 L 245 710" className="contact-blade" /><text x="184" y="695" className="reference-label">{references.get("stop") ?? "S0"} STOP NC</text></g></g>
      <g {...componentBox("start", selectedComponentId, onSelect, 430, 690, 145, 58)}><g className="device"><path d="M 375 730 H 440 M 490 730 H 548" className={lineClass(simulation.breakerClosed && !simulation.overloadTripped)} /><path d="M 440 712 L 490 730" className={simulation.startPressed ? "contact-blade closed" : "contact-blade"} /><text x="433" y="695" className="reference-label">{references.get("start") ?? "S1"} START NO</text></g></g>
      <g {...componentBox("contactor", selectedComponentId, onSelect, 720, 680, 150, 92)}><g className="device"><path d="M 548 730 H 780" className={lineClass(simulation.contactorEnergized)} /><rect x="780" y="706" width="54" height="45" rx="4" className={simulation.contactorEnergized ? "coil energized" : "coil"} /><text x="789" y="734" className="coil-label">KM1</text><path d="M 834 730 H 860 V 765" className="wire neutral" /><text x="783" y="696" className="terminal-label">A1</text><text x="843" y="756" className="terminal-label">A2</text>
        <path d="M 375 730 V 665 H 610 V 730" className={simulation.contactorEnergized ? "wire energized" : "wire"} /><path d="M 525 665 L 575 665" className={simulation.contactorEnergized ? "contact-blade closed" : "contact-blade"} /><text x="493" y="654" className="reference-label small">KM1 13–14 HOLD</text>
        <path d="M 310 730 H 375" className={simulation.overloadTripped ? "wire fault" : lineClass(simulation.breakerClosed)} /><path d="M 330 720 L 355 740" className={simulation.overloadTripped ? "contact-blade open-fault" : "contact-blade closed"} /><text x="302" y="695" className="reference-label">F1 95–96</text>
      </g></g>

      {document.components.filter((component) => !staticComponentIds.has(component.id)).map((component) => <PlacedSymbol key={component.id} component={component} selectedComponentId={selectedComponentId} onSelect={onSelect} />)}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)}</title></g>)}</g>}
    </svg>
  </div>;
}


