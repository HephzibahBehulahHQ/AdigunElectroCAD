import type { CircuitDocument } from "../types/electrical";
import type { DolSimulationState } from "../simulation/dolSimulator";
import type { TerminalEndpoint } from "../types/electrical";
import { catalogById } from "../catalog/dolCatalog";

interface Props {
  document: CircuitDocument;
  selectedComponentId: string;
  simulation: DolSimulationState;
  wireMode: boolean;
  wireStart: TerminalEndpoint | null;
  onSelect: (componentId: string) => void;
  onTerminalSelect: (endpoint: TerminalEndpoint) => void;
}

interface TerminalAnchor {
  endpoint: TerminalEndpoint;
  x: number;
  y: number;
}

const staticComponentIds = new Set(["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"]);
const endpointKey = (endpoint: TerminalEndpoint) => `${endpoint.componentId}.${endpoint.terminalId}`;
const isSameEndpoint = (left: TerminalEndpoint | null, right: TerminalEndpoint) => Boolean(left && left.componentId === right.componentId && left.terminalId === right.terminalId);

function terminalAnchors(document: CircuitDocument): TerminalAnchor[] {
  const anchors: TerminalAnchor[] = document.id === "reference-dol-motor-starter" ? [
    anchor("supply", "l1", 165, 100), anchor("supply", "l2", 255, 100), anchor("supply", "l3", 345, 100), anchor("supply", "pe", 445, 100),
    anchor("breaker", "l1-in", 165, 146), anchor("breaker", "l2-in", 255, 146), anchor("breaker", "l3-in", 345, 146), anchor("breaker", "l1-out", 165, 252), anchor("breaker", "l2-out", 255, 252), anchor("breaker", "l3-out", 345, 252),
    anchor("contactor", "l1-in", 165, 252), anchor("contactor", "l2-in", 255, 252), anchor("contactor", "l3-in", 345, 252), anchor("contactor", "l1-out", 165, 303), anchor("contactor", "l2-out", 255, 303), anchor("contactor", "l3-out", 345, 303), anchor("contactor", "a1", 780, 730), anchor("contactor", "a2", 834, 730), anchor("contactor", "aux-13", 375, 665), anchor("contactor", "aux-14", 610, 665),
    anchor("overload", "l1-in", 165, 370), anchor("overload", "l2-in", 255, 370), anchor("overload", "l3-in", 345, 370), anchor("overload", "t1", 165, 401), anchor("overload", "t2", 255, 401), anchor("overload", "t3", 345, 401), anchor("overload", "aux-95", 310, 730), anchor("overload", "aux-96", 375, 730),
    anchor("motor", "u1", 165, 516), anchor("motor", "v1", 255, 516), anchor("motor", "w1", 345, 516), anchor("motor", "pe", 445, 540),
    anchor("control", "line", 130, 730), anchor("control", "neutral", 130, 765), anchor("stop", "21", 170, 730), anchor("stop", "22", 280, 730), anchor("start", "13", 440, 730), anchor("start", "14", 548, 730),
  ] : [];
  for (const component of document.components.filter((item) => !staticComponentIds.has(item.id))) {
    const definition = catalogById.get(component.definitionId);
    definition?.terminals.forEach((terminal, index) => anchors.push(anchor(component.id, terminal.id, component.x + (index % 2 ? 32 : -32), component.y - 15 + Math.floor(index / 2) * 12)));
  }
  return anchors;
}

function anchor(componentId: string, terminalId: string, x: number, y: number): TerminalAnchor {
  return { endpoint: { componentId, terminalId }, x, y };
}

function wirePath(from: TerminalAnchor, to: TerminalAnchor): string {
  const middleX = Math.round((from.x + to.x) / 2);
  return `M ${from.x} ${from.y} H ${middleX} V ${to.y} H ${to.x}`;
}

const componentBox = (id: string, selected: string, onSelect: (componentId: string) => void, x: number, y: number, width: number, height: number) => ({
  onClick: () => onSelect(id),
  className: id === selected ? "schematic-component selected" : "schematic-component",
  children: <rect x={x} y={y} width={width} height={height} rx="6" className="selection-boundary" />,
});

function FreeSchematic({ document, selectedComponentId, wireMode, wireStart, onSelect, onTerminalSelect }: Props) {
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const labelFor = (definitionId: string) => catalogById.get(definitionId)?.referencePrefix ?? "?";

  return <div className="schematic-wrap">
    <svg className="schematic" viewBox="0 0 1100 780" role={wireMode ? "group" : "img"} aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Free electrical schematic sheet"}>
      <defs><pattern id="free-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" /><rect width="1100" height="780" fill="url(#free-grid)" />
      <text x="65" y="55" className="drawing-title">FREE ELECTRICAL SCHEMATIC SHEET</text>
      <text x="65" y="80" className="sheet-note">Insert catalog components, wire compatible terminals and move placed symbols on the grid.</text>
      {document.wires.filter((wire) => wire.id.startsWith("manual-wire-")).map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to)} className="wire manual-wire" /> : null;
      })}
      {document.components.map((component) => <g key={component.id} onClick={() => onSelect(component.id)} className={component.id === selectedComponentId ? "schematic-component selected" : "schematic-component"}>
        <rect x={component.x - 55} y={component.y - 35} width="110" height="70" rx="6" className="selection-boundary" />
        <rect x={component.x - 47} y={component.y - 27} width="94" height="54" rx="4" className="free-symbol" />
        <text x={component.x} y={component.y - 2} className="free-reference" textAnchor="middle">{component.reference}</text>
        <text x={component.x} y={component.y + 16} className="free-kind" textAnchor="middle">{labelFor(component.definitionId)}</text>
      </g>)}
      {document.components.length === 0 && <text x="550" y="410" className="empty-sheet" textAnchor="middle">Select a catalog model and choose Insert to begin this sheet.</text>}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)}</title></g>)}</g>}
    </svg>
  </div>;
}

export function Schematic({ document, selectedComponentId, simulation, wireMode, wireStart, onSelect, onTerminalSelect }: Props) {
  if (document.id !== "reference-dol-motor-starter") return <FreeSchematic document={document} selectedComponentId={selectedComponentId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={onSelect} onTerminalSelect={onTerminalSelect} />;
  const references = new Map(document.components.map((component) => [component.id, component.reference]));
  const energized = simulation.breakerClosed && simulation.contactorEnergized && !simulation.overloadTripped;
  const switched = simulation.breakerClosed;
  const lineClass = (active: boolean) => active ? "wire energized" : "wire";
  const anchors = terminalAnchors(document);
  const anchorIndex = new Map(anchors.map((item) => [endpointKey(item.endpoint), item]));
  const manualWires = document.wires.filter((wire) => wire.id.startsWith("manual-wire-"));

  return <div className="schematic-wrap">
    <svg className="schematic" viewBox="0 0 1100 780" role={wireMode ? "group" : "img"} aria-label={wireMode ? "Wiring mode: choose two compatible schematic terminals" : "Direct-on-line motor starter power and control schematic"}>
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity=".075" strokeWidth="1" /></pattern></defs>
      <rect width="1100" height="780" className="sheet-bg" /><rect width="1100" height="780" fill="url(#grid)" />
      {manualWires.map((wire) => {
        const from = anchorIndex.get(endpointKey(wire.from));
        const to = anchorIndex.get(endpointKey(wire.to));
        return from && to ? <path key={wire.id} d={wirePath(from, to)} className="wire manual-wire" /> : null;
      })}
      <text x="65" y="43" className="drawing-title">POWER CIRCUIT — DIRECT-ON-LINE MOTOR STARTER</text>
      <text x="500" y="640" className="drawing-title control-title">CONTROL CIRCUIT — START / STOP / HOLD</text>

      {[{ x: 165, label: "L1", color: "phase-l1" }, { x: 255, label: "L2", color: "phase-l2" }, { x: 345, label: "L3", color: "phase-l3" }].map((phase) => <g key={phase.label}><text x={phase.x - 15} y="82" className="phase-label">{phase.label}</text><circle cx={phase.x} cy="100" r="7" className={phase.color} /><path d={`M ${phase.x} 107 V 146`} className={`wire ${phase.color}`} /></g>)}
      <text x="435" y="82" className="phase-label pe">PE</text><path d="M 445 100 V 540 H 390" className="wire pe-wire" />

      <g {...componentBox("breaker", selectedComponentId, onSelect, 120, 140, 280, 94)}>
        <g className="device"><text x="425" y="184" className="reference-label">{references.get("breaker") ?? "Q1"}</text><text x="425" y="205" className="device-label">3-pole breaker</text>
          {[165, 255, 345].map((x) => <g key={x}><path d={`M ${x} 146 v 10 l 24 30`} className="contact-blade" /><path d={`M ${x} 197 V 252`} className={lineClass(switched)} /></g>)}
          <path d="M 142 220 H 368" className="mechanical-link" />
        </g>
      </g>

      <g {...componentBox("contactor", selectedComponentId, onSelect, 120, 245, 280, 112)}>
        <g className="device"><text x="425" y="284" className="reference-label">{references.get("contactor") ?? "KM1"}</text><text x="425" y="305" className="device-label">main contactor</text>
          {[165, 255, 345].map((x) => <g key={x}><path d={`M ${x} 252 v 14 l 24 ${energized ? "0" : "32"}`} className={energized ? "contact-blade closed" : "contact-blade"} /><path d={`M ${x} 303 V 370`} className={lineClass(energized)} /></g>)}
          <path d="M 142 336 H 368" className="mechanical-link" />
        </g>
      </g>

      <g {...componentBox("overload", selectedComponentId, onSelect, 120, 365, 280, 104)}>
        <g className="device"><text x="425" y="405" className="reference-label">{references.get("overload") ?? "F1"}</text><text x="425" y="426" className="device-label">thermal overload</text>
          {[165, 255, 345].map((x) => <g key={x}><rect x={x - 15} y="372" width="30" height="29" className={simulation.overloadTripped ? "overload tripped" : "overload"} /><path d={`M ${x} 401 V 516`} className={lineClass(energized)} /></g>)}
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

      {document.components.filter((component) => !["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"].includes(component.id)).map((component) => <g key={component.id} onClick={() => onSelect(component.id)} className={component.id === selectedComponentId ? "schematic-component selected" : "schematic-component"}><rect x={component.x - 32} y={component.y - 23} width="64" height="46" className="extra-component" /><text x={component.x - 18} y={component.y + 4} className="extra-label">{component.reference}</text></g>)}
      {wireMode && <g className="terminal-anchors">{anchors.map((item) => <g key={endpointKey(item.endpoint)} role="button" tabIndex={0} aria-label={`Wire terminal ${endpointKey(item.endpoint)}`} onClick={(event) => { event.stopPropagation(); onTerminalSelect(item.endpoint); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTerminalSelect(item.endpoint); } }}><circle cx={item.x} cy={item.y} r="7" className={isSameEndpoint(wireStart, item.endpoint) ? "terminal-anchor active" : "terminal-anchor"} /><title>{endpointKey(item.endpoint)}</title></g>)}</g>}
    </svg>
  </div>;
}
