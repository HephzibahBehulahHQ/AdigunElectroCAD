import { sm1223Connectors, sm1223SymbolId } from "../catalog/siemensSm1223";
import { fusePoleClosed } from "../simulation/industrialDevices";
import { controlTerminalOffset, powerTerminalOffset } from "../cad/componentGeometry";
import { evaluateFunctionalSignal } from "../simulation/functionalModels";

const mark = "generic-symbol-mark functional-symbol";
const text = "functional-symbol-text";

function poleContactPath(x: number, y: number, closed: boolean) {
  return `M ${x} ${y - 27} V ${y - 12} L ${x + (closed ? 0 : 9)} ${y + (closed ? 8 : 2)}
    M ${x} ${y + 8} V ${y + 27}`;
}

export function hasDedicatedFunctionalSymbol(symbolId: string) {
  return ["pushbutton-no", "pushbutton-nc", "control-supply", "contactor-3p", "breaker", "breaker-3p", "overload", "overload-3p", "supply-ac", "supply-3p", "motor-3p", "motor-3phase", "power-supply", "power-supply-01", "starter", "relay", "fuse", "transformer", "plc-io", "vfd", "timer", "switch", "terminal", "actuator", "meter", "sensor"].includes(symbolId) || symbolId === "motor" || symbolId.startsWith("supply-ac-") || (symbolId.startsWith("motor-") && !symbolId.startsWith("motor-ac-")) || symbolId.startsWith("breaker-") || symbolId.startsWith("starter-") || symbolId.startsWith("relay-") || symbolId.startsWith("fuse-") || symbolId.startsWith("transformer-") || symbolId.startsWith("plc-io-") || symbolId.startsWith("vfd-") || symbolId.startsWith("timer-") || symbolId.startsWith("switch-") || symbolId.startsWith("terminal-") || symbolId.startsWith("actuator-") || symbolId.startsWith("meter-") || /^(logic|sensor|signal|pneumatic|hydraulic|hvac|solar|safety|panel|cable|user)-/.test(symbolId);
}

export function FunctionalSymbol({ symbolId, x, y, properties = {}, componentName }: { symbolId: string; x: number; y: number; properties?: Record<string, string | number | boolean>; componentName?: string }) {
  const disconnector = /^switch-disconnector-([1-4])p$/.exec(symbolId);
  if (disconnector) {
    const poles = Number(disconnector[1]);
    const closed = properties.closed === true;
    const offsets = Array.from({ length: poles }, (_, index) => (index - (poles - 1) / 2) * 24);
    return <g className={mark} aria-label={`${poles}-pole switch-disconnector, ${closed ? "closed" : "open"}`} data-state={closed ? "closed" : "open"}>
      {poles > 1 && <path d={`M ${x + offsets[0]} ${y - 7} H ${x + offsets.at(-1)!}`} strokeDasharray="3 4" data-mechanical-link="" />}
      {offsets.map(offset => <path key={offset} d={poleContactPath(x + offset, y, closed)} />)}
    </g>;
  }
  const cy = y - 13;
  if (!hasDedicatedFunctionalSymbol(symbolId)) return null;

  if (symbolId === "power-supply" || symbolId === "power-supply-01") return <g className={mark} aria-label="Siemens SITOP PSU100C 24 V DC power supply"><rect x={x - 29} y={cy - 21} width="58" height="42" rx="4" /><path d={`M ${x - 16} ${cy} H ${x + 16} M ${x - 8} ${cy - 8} H ${x + 8} M ${x} ${cy - 14} V ${cy - 2}`} /><text x={x} y={cy + 15} textAnchor="middle" className={text}>DC</text></g>;
  if (symbolId === "control-supply") return <g className={mark} aria-label="Isolated AC control supply"><circle cx={x} cy={cy} r="13" /><path d={`M ${x - 9} ${cy} Q ${x - 4} ${cy - 12} ${x} ${cy} T ${x + 9} ${cy}`} /></g>;
  if (symbolId === "user-indicator-lamp") {
    const color = typeof properties.color === "string" && /^#[0-9a-f]{6}$/i.test(properties.color) ? properties.color : "#64748b";
    const terminal1 = typeof properties.terminalLabel1 === "string" ? properties.terminalLabel1.slice(0, 8) : "T1";
    const terminal2 = typeof properties.terminalLabel2 === "string" ? properties.terminalLabel2.slice(0, 8) : "T2";
    const lit = properties.runtimeLampLit === true;
    return <g className={mark} aria-label={lit ? "Indicator lamp lit" : "Indicator lamp off"}><path d={`M ${x - 32} ${cy} H ${x - 12} M ${x + 12} ${cy} H ${x + 32}`} /><circle cx={x} cy={cy} r="12" fill={color} fillOpacity={lit ? 1 : .32} /><path d={`M ${x - 6} ${cy - 6} L ${x + 6} ${cy + 6} M ${x - 6} ${cy + 6} L ${x + 6} ${cy - 6}`} /><text x={x - 24} y={cy + 24} textAnchor="middle" className={text} textLength="32" lengthAdjust="spacingAndGlyphs">{terminal1}</text><text x={x + 24} y={cy + 24} textAnchor="middle" className={text} textLength="32" lengthAdjust="spacingAndGlyphs">{terminal2}</text></g>;
  }
  if (symbolId === "supply-ac" || symbolId === "supply-3p" || symbolId.startsWith("supply-ac-")) {
    const referenceSupply = symbolId === "supply-3p";
    const phaseOffset = referenceSupply ? 24 : 32;
    const terminalY = y + (referenceSupply ? -35 : 27);
    const lead = referenceSupply ? -1 : 1;
    return <g className={mark} aria-label="Three-phase AC supply">
      {[-phaseOffset, 0, phaseOffset].map(offset => <path key={offset} d={`M ${x + offset} ${terminalY} V ${y + lead * 12}`} />)}
      <rect x={x - phaseOffset - 6} y={y - 12} width={phaseOffset * 2 + 12} height="24" />
      <text x={x} y={y + 4} textAnchor="middle" className={text}>3~</text>
      <path d={`M ${x + 47} ${y} H ${x + phaseOffset + 6}`} />
    </g>;
  }
  if (symbolId === "motor-01" || symbolId === "motor" || symbolId === "motor-3p" || symbolId === "motor-3phase" || (symbolId.startsWith("motor-") && !symbolId.startsWith("motor-ac-"))) {
    const identifiedMotor = "Siemens SIMOTICS GP 1LE1003-1CB23-4AA4, 7.5 kW, 400 V delta, 14.3 A, 4-pole induction motor";
    const name = componentName?.startsWith("Generic ") ? `${componentName}, three-phase induction motor` : componentName?.startsWith("Siemens SIMOTICS") ? identifiedMotor : componentName ?? (symbolId === "motor-01" ? identifiedMotor : "Three-phase induction motor");
    return <g className={mark} aria-label={name}><circle cx={x} cy={y} r="20" /><text x={x} y={y - 1} textAnchor="middle" className={text}>M</text><text x={x} y={y + 13} textAnchor="middle" className={text}>3~</text></g>;
  }
  if (symbolId === "meter" || symbolId.startsWith("meter-")) {
    const kind = typeof properties.measurementKind === "string" ? properties.measurementKind : "Voltage";
    const units: Record<string, string> = { Voltage: "V", Current: "A", Power: "W", Frequency: "Hz" };
    const unit = units[kind] ?? "";
    const reading = Number(properties.measuredValue ?? 0);
    const faulted = Boolean(properties.runtimeSignalError);
    const maximum = Math.max(0.001, Number(properties.scaleMaximum ?? 100));
    const ratio = Math.max(0, Math.min(1, reading / maximum));
    const angle = (-140 + ratio * 100) * Math.PI / 180;
    const needleX = x + Math.cos(angle) * 11, needleY = y + Math.sin(angle) * 11;
    return <g className={mark} aria-label={`Digital panel meter, ${kind}, ${!faulted && Number.isFinite(reading) ? reading.toFixed(Math.abs(reading) < 1 ? 3 : 1) : "invalid"} ${unit}`}>
      {["supply", "common", "signal"].map((terminalId) => {
        const offset = controlTerminalOffset("catalog-panel-meter", terminalId)!;
        const rimX = Math.sqrt(22 ** 2 - offset.y ** 2) * Math.sign(offset.x);
        return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x + rimX}`} />;
      })}
      <circle cx={x} cy={y} r="22" />
      <path d={`M ${x - 13} ${y + 9} A 16 16 0 0 1 ${x + 13} ${y + 9}`} />
      {faulted ? <path d={`M ${x - 4} ${y - 5} l 8 8 m 0 -8 l -8 8`} /> : <path d={`M ${x} ${y + 5} L ${needleX} ${needleY}`} />}
      <circle cx={x} cy={y + 5} r="2" />
      <text x={x} y={y + 19} textAnchor="middle" className={text}>{unit}</text>
    </g>;
  }
  if (symbolId === "sensor" || /^sensor-\d+$/.test(symbolId)) return <g className={mark} aria-label="Inductive proximity sensor with +24V, SIG and 0V terminals">
    <rect x={x - 24} y={y - 18} width="48" height="36" rx="3" />
    {["supply", "common", "signal"].map((terminalId) => {
      const offset = controlTerminalOffset("catalog-proximity-sensor", terminalId)!;
      return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x + Math.sign(offset.x) * 24}`} />;
    })}
    <path d={`M ${x - 4} ${y - 6} Q ${x + 5} ${y} ${x - 4} ${y + 6} M ${x + 3} ${y - 10} Q ${x + 17} ${y} ${x + 3} ${y + 10}`} />
    <circle cx={x - 13} cy={y} r="3" />
  </g>;
  if (symbolId === "actuator" || symbolId.startsWith("actuator-")) {
    const energized = properties.energized === true;
    const plunger = energized ? x + 24 : x + 10;
    const spring = properties.returnSpring === true;
    return <g className={mark} aria-label={`Solenoid actuator, ${energized ? "energized" : "de-energized"}`} data-state={energized ? "energized" : "idle"}>
      {["a1", "a2"].map((terminalId) => {
        const offset = controlTerminalOffset("catalog-solenoid-actuator", terminalId)!;
        return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x - 24}`} />;
      })}
      <rect x={x - 24} y={y - 17} width="24" height="34" rx="2" />
      <path d={`M ${x - 20} ${y - 10} q 16 5 0 10 q -16 5 0 10 M ${x} ${y} H ${plunger} M ${plunger} ${y - 8} V ${y + 8}${spring ? ` M ${x + 27} ${y - 10} l 4 5 l -8 5 l 8 5 l -4 5` : ""}`} />
    </g>;
  }
  if (symbolId === "terminal-m12-male-5") return <g className={mark} aria-label="Five-pin M12 male mating face">
    <path data-connector-key="" d={`M ${x - 6} ${y + 38} A 39 39 0 1 1 ${x + 6} ${y + 38} v -6 h -12 z`} />
    {[[-22, 22], [22, 22], [22, -22], [-22, -22], [0, 0]].map(([dx, dy], index) =>
      <circle key={index} data-connector-pin={index + 1} cx={x + dx} cy={y + dy} r={3} />)}
  </g>;
  if (symbolId === "terminal-double-level") return <g className={mark} aria-label="Double-level terminal with isolated upper and lower conductors">
    {[-14, 14].map(offset => <g key={offset} data-terminal-level={offset < 0 ? "upper" : "lower"}>
      <path d={`M ${x - 42} ${y + offset} h 84`} />
      <circle cx={x} cy={y + offset} r={3} fill="currentColor" />
    </g>)}
  </g>;
  if (symbolId === "terminal" || symbolId.startsWith("terminal-")) {
    const connected = properties.continuityClosed !== false;
    return <g className={mark} aria-label={`Feed-through terminal block, ${connected ? "connected" : "open"}`} data-state={connected ? "connected" : "open"}>
      <path d={`M ${x - 47} ${y} H ${x - 22} M ${x + 22} ${y} H ${x + 47}`} />
      <rect x={x - 22} y={y - 15} width="44" height="30" rx="2" />
      <path d={connected ? `M ${x - 22} ${y} H ${x + 22}` : `M ${x - 22} ${y} H ${x - 4} M ${x + 4} ${y} H ${x + 22}`} />
      <circle cx={x} cy={y - 7} r="3" />
    </g>;
  }
  if (symbolId === "switch" || symbolId.startsWith("switch-")) {
    const closed = properties.closed === true;
    const form = properties.contactForm === "NC" ? "normally closed" : "normally open";
    const positions = Math.max(2, Math.min(4, Number(properties.positions) || 2));
    return <g className={mark} aria-label={`Maintained selector switch, ${form}, ${positions} positions, ${closed ? "closed" : "open"}`} data-state={closed ? "closed" : "open"}>
      <path d={`M ${x - 47} ${y} H ${x - 12} M ${x + 12} ${y} H ${x + 47} M ${closed ? `M ${x - 12} ${y} H ${x + 12}` : `M ${x - 12} ${y} L ${x + 4} ${y - 11}`} M ${x} ${y - 16} V ${y - 27}`} />
      <circle cx={x} cy={y - 16} r="4" />
      {Array.from({ length: positions }, (_, index) => {
        const angle = (-45 + index * (90 / (positions - 1))) * Math.PI / 180;
        const x1 = x + Math.sin(angle) * 12, y1 = y - 16 - Math.cos(angle) * 12;
        const x2 = x + Math.sin(angle) * 16, y2 = y - 16 - Math.cos(angle) * 16;
        return <path key={index} d={`M ${x1} ${y1} L ${x2} ${y2}`} />;
      })}
    </g>;
  }
  if (symbolId === "timer" || symbolId.startsWith("timer-")) {
    const energized = properties.energized === true;
    const timingComplete = energized && Number(properties.elapsedSeconds ?? 0) >= Number(properties.delaySeconds ?? Infinity);
    return <g className={mark} aria-label={`On-delay timer, ${timingComplete ? "timed contact made" : energized ? "timing" : "de-energized"}`} data-state={timingComplete ? "timed" : energized ? "timing" : "idle"}>
      <path d={`M ${x - 47} ${y - 12} H ${x - 38} M ${x - 47} ${y + 12} H ${x - 38}`} />
      <rect x={x - 38} y={y - 15} width="16" height="30" rx="2" />
      <path d={`M ${x - 35} ${y - 9} q 10 4 0 8 q -10 4 0 8`} />
      <circle cx={x - 1} cy={y - 10} r="11" />
      <path d={`M ${x - 1} ${y - 10} V ${y - 16} M ${x - 1} ${y - 10} L ${x + 5} ${y - 7}`} />
      <path d={`M ${x} ${y + 27} V ${y + 5} H ${x + 8} M ${x + 47} ${y - 12} H ${x + 24} M ${x + 47} ${y + 12} H ${x + 24}`} />
      <path d={`M ${x + 8} ${y + 5} L ${x + 24} ${y + (timingComplete ? 12 : -12)}`} />
    </g>;
  }
  if (symbolId === "vfd" || symbolId.startsWith("vfd-")) return <g className={mark} aria-label="Variable-frequency drive with three-phase input and U/V/W output">
    <rect x={x - 30} y={y - 22} width="60" height="44" rx="2" />
    {["l1-in", "l2-in", "l3-in", "u1", "v1", "w1", "pe"].map((terminalId) => {
      const offset = powerTerminalOffset("catalog-variable-frequency-drive", terminalId)!;
      const lead = terminalId === "pe" ? `V ${y + 22}` : `H ${x + Math.sign(offset.x) * 30}`;
      return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} ${lead}`} />;
    })}
    <path d={`M ${x} ${y - 17} V ${y + 17}`} />
    <text x={x - 15} y={y + 5} textAnchor="middle" className={text}>~</text>
    <text x={x + 15} y={y + 5} textAnchor="middle" className={text}>f</text>
  </g>;
  if (symbolId === sm1223SymbolId) return <g className={mark} aria-label="SM 1223 digital module, eight inputs and eight transistor outputs">
    <rect x={x - 156} y={y - 35} width={312} height={70} />
    <text x={x} y={y + 4} className={text} textAnchor="middle">SM 1223 · 8 DI / 8 DQ</text>
    {sm1223Connectors.map(({ name, title, terminals }) => {
      const first = terminals[0].position!;
      const last = terminals[terminals.length - 1].position!;
      const edge = first.y < 0 ? -35 : 35;
      return <g key={name} data-io-connector={name}>
        <text x={x + (first.x + last.x) / 2} y={y + (edge < 0 ? -19 : 25)} className={text} textAnchor="middle">{name} · {title}</text>
        {terminals.map(({ id, position }) => <path key={id} d={`M ${x + position!.x} ${y + edge} V ${y + position!.y}`} />)}
      </g>;
    })}
  </g>;
  if (symbolId === "plc-io" || symbolId.startsWith("plc-io-")) return <g className={mark} aria-label="PLC digital and analog I/O module">
    <rect x={x - 25} y={y - 29} width="50" height="58" rx="2" />
    <path d={`M ${x} ${y - 29} V ${y + 29} M ${x - 25} ${y} H ${x}`} />
    {["in-0", "in-1", "ai-0", "ai-1", "out-0", "out-1", "common"].map((terminalId) => {
      const offset = controlTerminalOffset("catalog-plc-digital-io", terminalId)!;
      return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x + Math.sign(offset.x) * 25}`} />;
    })}
    <text x={x - 12} y={y - 11} textAnchor="middle" className={text}>I</text>
    <text x={x - 12} y={y + 18} textAnchor="middle" className={text}>AI</text>
    <text x={x + 12} y={y + 4} textAnchor="middle" className={text}>Q</text>
  </g>;
  if (symbolId === "transformer" || symbolId.startsWith("transformer-")) return <g className={mark} aria-label="Transformer with primary and secondary windings">
    <path d={`M ${x - 47} ${y - 12} H ${x - 25} V ${y - 24} H ${x - 8}
      M ${x - 47} ${y + 12} H ${x - 25} V ${y + 24} H ${x - 8}
      M ${x + 47} ${y - 12} H ${x + 25} V ${y - 24} H ${x + 8}
      M ${x + 47} ${y + 12} H ${x + 25} V ${y + 24} H ${x + 8}`} />
    <path d={`M ${x - 8} ${y - 24} C ${x - 22} ${y - 24} ${x - 22} ${y - 16} ${x - 8} ${y - 16} C ${x - 22} ${y - 16} ${x - 22} ${y - 8} ${x - 8} ${y - 8} C ${x - 22} ${y - 8} ${x - 22} ${y} ${x - 8} ${y} C ${x - 22} ${y} ${x - 22} ${y + 8} ${x - 8} ${y + 8} C ${x - 22} ${y + 8} ${x - 22} ${y + 16} ${x - 8} ${y + 16} C ${x - 22} ${y + 16} ${x - 22} ${y + 24} ${x - 8} ${y + 24}`} />
    <path d={`M ${x + 8} ${y - 24} C ${x + 22} ${y - 24} ${x + 22} ${y - 16} ${x + 8} ${y - 16} C ${x + 22} ${y - 16} ${x + 22} ${y - 8} ${x + 8} ${y - 8} C ${x + 22} ${y - 8} ${x + 22} ${y} ${x + 8} ${y} C ${x + 22} ${y} ${x + 22} ${y + 8} ${x + 8} ${y + 8} C ${x + 22} ${y + 8} ${x + 22} ${y + 16} ${x + 8} ${y + 16} C ${x + 22} ${y + 16} ${x + 22} ${y + 24} ${x + 8} ${y + 24}`} />
    <path d={`M ${x - 2} ${y - 27} V ${y + 27} M ${x + 2} ${y - 27} V ${y + 27}`} />
  </g>;
  if (symbolId === "fuse" || symbolId.startsWith("fuse-")) {
    const poles = (["l1", "l2", "l3"] as const).map((phase, index) => ({ phase, offset: (index - 1) * 32, closed: fusePoleClosed(properties, phase) }));
    const healthy = poles.every(({ closed }) => closed);
    return <g className={mark} aria-label={`Three-pole fuse switch, ${healthy ? "healthy" : "fuse open"}`} data-state={healthy ? "healthy" : "open"}>
      {poles.map(({ phase, offset, closed }) => <g key={phase} data-fuse-pole={phase} data-state={closed ? "closed" : "open"}>
        <path d={`M ${x + offset} ${y - 27} V ${y - 10} M ${x + offset} ${y + 10} V ${y + 27}`} />
        <rect x={x + offset - 5} y={y - 10} width="10" height="20" />
        <path d={closed ? `M ${x + offset - 2} ${y + 7} L ${x + offset + 2} ${y - 7}` : `M ${x + offset} ${y - 6} V ${y + 6}`} />
      </g>)}
    </g>;
  }
  if (symbolId === "relay" || symbolId.startsWith("relay-")) {
    const contacts = symbolId === "relay-finder-3851" ? 1 : Math.max(1, Math.min(3, Number(properties.changeoverContacts) || 1));
    const energized = properties.energized === true;
    return <g className={mark} aria-label={`Interface relay with ${contacts} changeover contact${contacts === 1 ? "" : "s"}, ${energized ? "energized" : "de-energized"}`} data-state={energized ? "energized" : "de-energized"}>
      <rect x={x - 43} y={y - 15} width="9" height="30" rx="2" />
      <path d={`M ${x - 40} ${y - 8} q 5 4 0 8 q -5 4 0 8`} />
      {["a1", "a2"].map((terminalId) => {
        const offset = controlTerminalOffset("catalog-interface-relay", terminalId)!;
        return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x - 43}`} />;
      })}
      {Array.from({ length: contacts }, (_, index) => {
        const [common, nc, no] = [1, 2, 4].map(pin => controlTerminalOffset("catalog-interface-relay", `${index + 1}${pin}`)!);
        const pivotX = x + common.x;
        const ncTip = x + nc.x + 5;
        const noTip = x + no.x - 5;
        return <g key={index}>
          <path d={`M ${pivotX} ${y + common.y} V ${y - 2} M ${x + nc.x} ${y + nc.y} V ${y + 17} H ${ncTip} M ${x + no.x} ${y + no.y} V ${y + 17} H ${noTip}`} />
          <path d={`M ${pivotX} ${y - 2} L ${energized ? noTip : ncTip} ${y + 17}`} />
        </g>;
      })}
    </g>;
  }
  if (symbolId === "breaker" || symbolId === "breaker-3p" || symbolId.startsWith("breaker-")) {
    const closed = properties.closed === true;
    const sourcedPoles = /^breaker-acti9-([1-4])p(n)?$/.exec(symbolId);
    const poles = sourcedPoles ? Number(sourcedPoles[1]) : Number(properties.poles) === 4 ? 4 : 3;
    const offsets = sourcedPoles ? Array.from({ length: poles }, (_, index) => (index - (poles - 1) / 2) * 24) : poles === 4 ? [-36, -12, 12, 36] : [-32, 0, 32];
    const poleLabel = sourcedPoles?.[2] ? (poles - 1) + "-pole plus switched neutral" : (poles === 3 ? "Three" : poles) + "-pole";
    return <g className={mark} aria-label={`${poleLabel} circuit breaker, ${closed ? "closed" : "open"}`} data-state={closed ? "closed" : "open"}>
      {poles > 1 && <path d={`M ${x + offsets[0]} ${y - 7} H ${x + offsets.at(-1)!}`} strokeDasharray="3 4" data-mechanical-link="" />}
      {offsets.map((offset, index) => {
        const poleX = x + offset;
        const neutral = Boolean(sourcedPoles?.[2]) && index === (properties.neutralSide === "left" ? 0 : poles - 1);
        return <g key={offset} data-pole={neutral ? "neutral" : "protected"}>
          <path d={poleContactPath(poleX, y, closed)} />
          {!neutral && <path d={`M ${poleX - 3} ${y - 22} l 6 6 m -6 0 l 6 -6`} />}
        </g>;
      })}
    </g>;
  }
  if (symbolId === "overload" || symbolId === "overload-3p") {
    const tripped = properties.tripped === true || properties.runtimeThermalTripped === true;
    const contact95Closed = !tripped;
    const contact97Closed = tripped;
    return <g className={mark} aria-label={`Siemens SIRIUS 3RU2126-4AB0 three-pole Class 10 overload relay, 95/96 ${contact95Closed ? "closed" : "open"}, 97/98 ${contact97Closed ? "closed" : "open"}`} data-state={tripped ? "tripped" : "healthy"}>
      <rect x={x - 41} y={y - 13} width="82" height="26" />
      {[-32, 0, 32].map(offset => <g key={offset}><path d={`M ${x + offset} ${y - 27} V ${y - 12} M ${x + offset} ${y - 12} L ${x + offset - 5} ${y - 7} L ${x + offset + 5} ${y - 2} L ${x + offset - 5} ${y + 3} L ${x + offset + 5} ${y + 8} L ${x + offset} ${y + 12} V ${y + 27}`} /></g>)}
      <path d={contact95Closed
        ? `M ${x - 47} ${y - 12} H ${x - 25} V ${y + 12} H ${x - 47}`
        : `M ${x - 47} ${y - 12} H ${x - 31} L ${x - 22} ${y - 2} M ${x - 25} ${y + 3} V ${y + 12} H ${x - 47}`} />
      <path d={contact97Closed
        ? `M ${x + 47} ${y - 12} H ${x + 25} V ${y + 12} H ${x + 47}`
        : `M ${x + 47} ${y - 12} H ${x + 31} L ${x + 22} ${y - 2} M ${x + 25} ${y + 3} V ${y + 12} H ${x + 47}`} />
      <circle cx={x + 19} cy={y + 18} r="3" fill={tripped ? "#c62828" : "#16824a"} aria-label={tripped ? "Tripped" : "Healthy"} />
    </g>;
  }
  if (symbolId === "starter" || symbolId.startsWith("starter-")) {
    const energized = properties.energized === true;
    return <g className={mark} aria-label={`Siemens SIRIUS 3RT2025-1BB40 contactor, three main poles, one NO auxiliary and one NC auxiliary, ${energized ? "energized" : "de-energized"}`} data-state={energized ? "energized" : "de-energized"}>
      <path d={`M ${x - 24} ${y - 1} H ${x + 24}`} strokeDasharray="3 4" />
      {[-24, 0, 24].map(offset => <path key={offset} d={poleContactPath(x + offset, y, energized)} />)}
      <path d={`M ${x - 16} ${y - 47} H ${x - 12} C ${x - 4} ${y - 59}, ${x - 4} ${y - 35}, ${x} ${y - 47} C ${x + 4} ${y - 59}, ${x + 4} ${y - 35}, ${x + 12} ${y - 47} H ${x + 16}`} />
      <path d={`M ${x - 47} ${y - 12} H ${x - 36} M ${x - 47} ${y + 12} H ${x - 36} ${energized ? `M ${x - 36} ${y - 12} V ${y + 12}` : `M ${x - 36} ${y - 12} L ${x - 26} ${y - 1} M ${x - 26} ${y + 12} H ${x - 36}`} M ${x + 47} ${y - 12} H ${x + 36} M ${x + 47} ${y + 12} H ${x + 36} ${energized ? `M ${x + 36} ${y - 12} L ${x + 26} ${y - 1} M ${x + 26} ${y + 12} H ${x + 36}` : `M ${x + 36} ${y - 12} V ${y + 12}`} `} />
    </g>;
  }
  if (symbolId === "contactor-3p") {
    const energized = properties.energized === true;
    return <g className={mark} aria-label="Three-pole contactor" data-state={energized ? "energized" : "de-energized"}>
      <path d={`M ${x - 32} ${y - 1} H ${x + 32}`} strokeDasharray="3 4" />
      {[-32, 0, 32].map(offset => <path key={offset} d={poleContactPath(x + offset, y, energized)} />)}
      <path d={`M ${x - 47} ${y - 12} V ${y - 9} M ${x - 47} ${y + 9} V ${y + 12}
        M ${x + 47} ${y - 12} V ${y - 5} L ${x + (energized ? 47 : 42)} ${y + 5}
        M ${x + 47} ${y + 5} V ${y + 12}`} />
      <rect x={x - 51} y={y - 9} width="8" height="18" />
    </g>;
  }
  if (["pushbutton-no", "pushbutton-nc", "logic-no", "logic-nc"].includes(symbolId)) {
    const button = symbolId.startsWith("pushbutton-");
    const normallyClosed = symbolId.endsWith("-nc");
    const actuated = (button ? properties.pressed : properties.input) === true;
    const closed = normallyClosed !== actuated;
    const state = closed ? "closed" : "open";
    return <g className={mark} data-state={state} aria-label={`${normallyClosed ? "Normally closed" : "Normally open"} ${button ? "pushbutton" : "contact"}, ${state}`}>
      <path d={`M ${x - 47} ${y} H ${x - 11} L ${x + 11} ${y - (closed ? 0 : 13)} M ${x + 11} ${y} H ${x + 47}`} />
      {button ? <path d={`M ${x} ${y - 23} V ${y - 15} M ${x - 8} ${y - 23} H ${x + 8}`} />
        : <path d={`M ${x} ${y + 27} V ${y + 20} M ${x - 4} ${y + 20} H ${x + 4}`} />}
    </g>;
  }
  if (symbolId === "logic-coil" || symbolId === "logic-set" || symbolId === "logic-reset") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 15} M ${x + 15} ${cy} H ${x + 28}`} /><path d={`M ${x - 15} ${cy - 12} Q ${x} ${cy} ${x - 15} ${cy + 12} M ${x + 15} ${cy - 12} Q ${x} ${cy} ${x + 15} ${cy + 12}`} />{symbolId !== "logic-coil" && <text x={x} y={cy + 4} textAnchor="middle" className={text}>{symbolId === "logic-set" ? "S" : "R"}</text>}</g>;
  if (symbolId.startsWith("logic-edge-")) return <g className={mark}><path d={`M ${x - 27} ${cy + 8} H ${x - 6} V ${cy - 9} H ${x + 27}`} />{symbolId.endsWith("positive") ? <path d={`M ${x + 7} ${cy - 18} V ${cy - 5} M ${x + 2} ${cy - 10} L ${x + 7} ${cy - 5} L ${x + 12} ${cy - 10}`} /> : <path d={`M ${x + 7} ${cy + 18} V ${cy + 5} M ${x + 2} ${cy + 10} L ${x + 7} ${cy + 5} L ${x + 12} ${cy + 10}`} />}</g>;
  const gates: Record<string, { label: string; inverted: boolean }> = {
    and: { label: "&", inverted: false },
    or: { label: "≥1", inverted: false },
    not: { label: "1", inverted: true },
    nand: { label: "&", inverted: true },
    nor: { label: "≥1", inverted: true },
    xor: { label: "=1", inverted: false },
  };
  const gate = gates[symbolId.replace(/^logic-(gate-)?/, "")];
  if (gate) return <g className={mark} aria-label={symbolId.replace(/^logic-(gate-)?/, "").toUpperCase() + " logic gate"}>
    <rect x={x - 24} y={y - 22} width="44" height="32" />
    <text x={x - 2} y={y - 2} textAnchor="middle" className={text}>{gate.label}</text>
    {gate.inverted && <circle cx={x + 24} cy={y - 6} r="4" />}
  </g>;
  if (symbolId.startsWith("logic-comparator-")) { const label = symbolId.endsWith("greater-than") ? ">" : symbolId.endsWith("less-than") ? "<" : "="; return <g className={mark}><rect x={x - 22} y={cy - 15} width="44" height="30" rx="3" /><text x={x} y={cy + 6} textAnchor="middle" className={text}>{label}</text></g>; }
  if (symbolId.startsWith("logic-math-")) { const label = symbolId.endsWith("add") ? "+" : symbolId.endsWith("subtract") ? "−" : symbolId.endsWith("multiply") ? "×" : "÷"; return <g className={mark}><rect x={x - 22} y={cy - 15} width="44" height="30" rx="3" /><text x={x} y={cy + 6} textAnchor="middle" className={text}>{label}</text></g>; }

  if (symbolId === "sensor-pt100") return <g className={mark}><rect x={x - 22} y={cy - 12} width="44" height="24" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>PT</text></g>;
  if (symbolId === "sensor-thermocouple-two-lead") return <g className={mark}><path d={["M", x - 47, y - 18, "H", x - 25, "L", x, y + 4, "L", x + 25, y - 18, "H", x + 47].join(" ")} /><circle cx={x} cy={y + 4} r={3} /></g>;
  if (symbolId === "sensor-thermocouple") return <g className={mark}><path d={`M ${x - 24} ${cy - 12} V ${cy + 12} M ${x + 24} ${cy - 12} V ${cy + 12} M ${x - 16} ${cy - 12} L ${x + 16} ${cy + 12}`} /><circle cx={x} cy={cy} r="4" /></g>;
  if (symbolId === "sensor-flow") return <g className={mark}><circle cx={x} cy={cy} r="14" /><path d={`M ${x - 28} ${cy} H ${x + 20} M ${x + 13} ${cy - 7} L ${x + 20} ${cy} L ${x + 13} ${cy + 7}`} /></g>;
  if (symbolId === "sensor-level") return <g className={mark}><path d={`M ${x - 15} ${cy - 17} V ${cy + 17} H ${x + 15} V ${cy - 17}`} /><path d={`M ${x - 13} ${cy + 7} H ${x + 13}`} /></g>;
  if (symbolId === "sensor-vibration") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 20} L ${x - 13} ${cy - 12} L ${x - 3} ${cy + 12} L ${x + 7} ${cy - 12} L ${x + 17} ${cy + 12} L ${x + 25} ${cy}`} /></g>;
  if (symbolId === "sensor-encoder") return <g className={mark}><circle cx={x} cy={cy} r="14" />{[0, 90, 180, 270].map((angle) => <path key={angle} d={`M ${x} ${cy - 14} V ${cy - 8}`} transform={`rotate(${angle} ${x} ${cy})`} />)}<circle cx={x} cy={cy} r="3" /></g>;
  if (symbolId === "pneumatic-vovg-five-way") {
    const line = (x1: number, y1: number, x2: number, y2: number) => ["M", x+x1, y+y1, "L", x+x2, y+y2].join(" ");
    return <g className={mark}>
      <rect x={x-34} y={y-20} width={72} height={40} />
      <path d={[
        line(2,-20,2,20), line(-52,-11,-34,-11), line(-52,11,-34,11),
        line(8,-36,8,-20), line(32,-36,32,-20), ...[6,20,34].map(port => line(port,20,port,38)),
        line(20,20,32,-20), line(8,-20,6,20), line(28,-15,32,-20), line(33,-14,32,-20),
        line(2,14,6,20), line(10,14,6,20), line(30,16,38,16),
        line(-16,20,-28,-20), line(-4,-20,-2,20), line(-29,-14,-28,-20), line(-23,-15,-28,-20),
        line(-6,14,-2,20), line(2,14,-2,20), line(-34,16,-26,16),
        ["M",x+38,y,"l",3,-5,3,10,3,-10,3,5].join(" "),
      ].join(" ")} />
    </g>;
  }
  if (symbolId === "pneumatic-vovg-no" || symbolId === "pneumatic-vovg-nc") {
    const supplyOpen = symbolId === "pneumatic-vovg-no";
    const cell = (center: number, open: boolean) => {
      const port = center + (open ? -11 : 11);
      return ["M",port,y+20,"L",center,y-20,"M",center-5,y-14,"L",center,y-20,"L",center+5,y-14,
        "M",center+(open?7:-15),y+16,"h",8].join(" ");
    };
    return <g className={mark}>
      <rect x={x-34} y={y-20} width={72} height={40} />
      <path d={["M",x+2,y-20,"v",40,"M",x+20,y-36,"v",16,"M",x+9,y+20,"v",18,"M",x+31,y+20,"v",18,
        "M",x-52,y-11,"h",18,"M",x-52,y+11,"h",18,"M",x+38,y,"l",3,-5,3,10,3,-10,3,5].join(" ")} />
      <path d={cell(x+20, supplyOpen) + " " + cell(x-16, !supplyOpen)} />
    </g>;
  }
  if (symbolId === "sensor-encoder-differential") return <g className={mark}><rect x={x-25} y={y-39} width={50} height={78} rx={3} />
    <path d={[-22, 0, 22].map(offset => ["M",x-47,y+offset,"H",x-25].join(" ")).concat([-35,-21,-7,7,21,35].map(offset => ["M",x+25,y+offset,"H",x+47].join(" "))).join(" ")} />
    <path d={["M",x-10,y+5,"v",-10,"h",7,"v",10,"h",7,"v",-10,"h",6].join(" ")} />
  </g>;
  if (symbolId === "sensor-encoder-abc") return <g className={mark}><circle cx={x} cy={y} r={17} />
    <path d={[-22, 0, 22].map(offset => ["M",x-47,y+offset,"H",x-24,"M",x+24,y+offset,"H",x+47].join(" ")).join(" ")} />
    <path d={["M",x-10,y+5,"v",-10,"h",7,"v",10,"h",7,"v",-10,"h",6].join(" ")} />
  </g>;
  if (symbolId === "sensor-load-cell-bridge") return <g className={mark}>
    <path d={["M",x,y-20,"L",x+22,y,"L",x,y+20,"L",x-22,y,"Z",
      "M",x-47,y-26,"H",x,"V",y-20,"M",x-47,y+10,"H",x-34,"V",y-26,
      "M",x-47,y-8,"H",x-29,"V",y+28,"H",x,"V",y+20,"M",x-47,y+28,"H",x-29,
      "M",x+47,y-26,"H",x+30,"V",y,"H",x+22,"M",x+47,y-8,"H",x+36,"V",y+33,"H",x-22,"V",y,
      "M",x+47,y+10,"H",x+38].join(" ")} />
    <circle cx={x+35} cy={y+10} r={3} />
  </g>;
  if (symbolId === "sensor-load-cell") return <g className={mark}><path d={`M ${x - 25} ${cy - 10} H ${x + 25} M ${x - 16} ${cy + 10} H ${x + 16}`} /><path d={`M ${x - 12} ${cy - 10} L ${x - 6} ${cy + 10} M ${x + 12} ${cy - 10} L ${x + 6} ${cy + 10}`} /></g>;
  if (symbolId === "sensor-ct") return <g className={mark} aria-label="Current transformer with simulated secondary current output"><circle cx={x} cy={cy} r="14" /><path d={`M ${x - 28} ${cy} H ${x + 28} M ${x + 14} ${cy + 7} H ${x + 27} V ${y} H ${x + 47}`} /><text x={x} y={cy + 5} textAnchor="middle" className={text}>CT</text></g>;
  if (symbolId === "signal-adc" || symbolId === "signal-dac") return <g className={mark} aria-label={symbolId === "signal-adc" ? "Analog to digital converter" : "Digital to analog converter"}>
    <rect x={x - 24} y={cy - 15} width="48" height="30" rx="3" />
    {["in", "out", "common"].map((terminalId) => {
      const offset = controlTerminalOffset(symbolId, terminalId)!;
      return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} H ${x + Math.sign(offset.x) * 24}`} />;
    })}
    <text x={x} y={cy + 5} textAnchor="middle" className={text}>{symbolId === "signal-adc" ? "A/D" : "D/A"}</text>
  </g>;
  if (symbolId === "signal-current-transmitter") return <g className={mark} aria-label="Current to 4–20 mA transmitter"><rect x={x - 33} y={cy - 15} width="66" height="30" rx="3" /><path d={`M ${x - 47} ${y - 18} H ${x - 33} M ${x + 33} ${y - 18} H ${x + 47} M ${x - 47} ${y - 6} H ${x - 33}`} /><text x={x} y={cy + 5} textAnchor="middle" className={text}>A → mA</text></g>;
  if (symbolId === "signal-resistance-transmitter") return <g className={mark} aria-label="Resistance to current transmitter"><rect x={x - 33} y={cy - 15} width="66" height="30" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>Ω → mA</text></g>;

  if (symbolId.startsWith("pneumatic-valve-")) return <g className={mark}>{symbolId.endsWith("5-2") ? <><rect x={x - 26} y={cy - 15} width="26" height="30" /><rect x={x} y={cy - 15} width="26" height="30" /><path d={`M ${x - 22} ${cy + 8} L ${x - 4} ${cy - 8} M ${x + 4} ${cy - 8} L ${x + 22} ${cy + 8}`} /></> : <><rect x={x - 18} y={cy - 15} width="36" height="30" /><path d={`M ${x - 13} ${cy + 8} L ${x + 13} ${cy - 8} M ${x} ${cy - 15} V ${cy + 15}`} /></>}<circle cx={x - 32} cy={cy} r="4" /><circle cx={x + 32} cy={cy} r="4" /></g>;
  if (symbolId.startsWith("pneumatic-cylinder-")) return <g className={mark}><rect x={x - 24} y={cy - 12} width="34" height="24" /><path d={`M ${x + 10} ${cy} H ${x + 28}`} />{symbolId.endsWith("single") ? <path d={`M ${x - 18} ${cy - 8} L ${x - 10} ${cy + 8} L ${x - 2} ${cy - 8} L ${x + 6} ${cy + 8}`} /> : <path d={`M ${x - 24} ${cy} H ${x + 10}`} />}</g>;
  if (symbolId === "hydraulic-pump") return <g className={mark}><circle cx={x} cy={cy} r="15" /><path d={`M ${x - 8} ${cy + 9} L ${x + 9} ${cy} L ${x - 8} ${cy - 9} Z`} /></g>;
  if (symbolId === "hydraulic-cylinder") return <g className={mark}><rect x={x - 24} y={cy - 12} width="34" height="24" /><path d={`M ${x + 10} ${cy} H ${x + 28} M ${x - 24} ${cy} H ${x + 2}`} /></g>;
  if (symbolId === "hydraulic-relief") return <g className={mark}><path d={`M ${x - 25} ${cy} H ${x - 9} M ${x + 9} ${cy} H ${x + 25} M ${x - 9} ${cy - 10} L ${x + 9} ${cy + 10}`} /><path d={`M ${x - 14} ${cy - 15} L ${x - 7} ${cy - 9} L ${x - 14} ${cy - 3} L ${x - 7} ${cy + 3}`} /></g>;
  if (symbolId === "pneumatic-compressor") return <g className={mark}><circle cx={x} cy={cy} r="15" /><path d={`M ${x - 8} ${cy + 9} L ${x + 9} ${cy} L ${x - 8} ${cy - 9} Z`} /><path d={`M ${x + 15} ${cy} H ${x + 27}`} /></g>;
  if (symbolId === "pneumatic-frl") return <g className={mark}>{[-18, 0, 18].map((offset) => <rect key={offset} x={x + offset - 7} y={cy - 12} width="14" height="24" rx="2" />)}<path d={`M ${x - 18} ${cy - 8} L ${x - 18} ${cy + 8} M ${x} ${cy - 8} L ${x} ${cy + 8}`} /></g>;

  if (symbolId === "hvac-heater" || symbolId === "panel-heater") return <g className={mark}><path d={`M ${x - 26} ${cy} H ${x - 17} L ${x - 9} ${cy - 12} L ${x} ${cy + 12} L ${x + 9} ${cy - 12} L ${x + 17} ${cy} H ${x + 26}`} /></g>;
  if (symbolId === "hvac-fan" || symbolId === "panel-fan") return <g className={mark}><circle cx={x} cy={cy} r="15" />{[0, 120, 240].map((angle) => <path key={angle} d={`M ${x} ${cy} C ${x + 14} ${cy - 3} ${x + 15} ${cy - 12} ${x + 4} ${cy - 13}`} transform={`rotate(${angle} ${x} ${cy})`} />)}</g>;
  if (symbolId === "hvac-thermostat" || symbolId === "hvac-humidistat") {
    const thermostat = symbolId === "hvac-thermostat";
    const signal = evaluateFunctionalSignal(symbolId, properties, "out");
    const closed = signal?.value === true;
    const state = signal?.error ? "fault" : closed ? "contact closed" : "contact open";
    const label = `${thermostat ? "Thermostat" : "Humidistat"}: ${state}`;
    const contactY = cy + 22;
    return <g className={mark} aria-label={label}>
      <title>{label}</title>
      <circle cx={x} cy={cy} r="14" />
      <text x={x} y={cy + 5} textAnchor="middle" className={text}>{thermostat ? "T" : "H"}</text>
      <path d={closed ? `M ${x - 12} ${contactY} L ${x + 12} ${contactY}` : `M ${x - 12} ${contactY} L ${x + 5} ${contactY - 6} M ${x + 9} ${contactY} H ${x + 12}`} />
    </g>;
  }
  if (symbolId === "hvac-damper") {
    const position = properties.runtimeDamperPositionPercent ?? properties.positionPercent;
    const validPosition = typeof position === "number" && Number.isFinite(position) && position >= 0 && position <= 100;
    const rise = validPosition ? 8 * (1 - position / 100) : 4;
    const label = validPosition ? `Damper position ${position.toFixed(1)}%` : "Damper position unavailable";
    return <g className={mark} aria-label={label}><title>{label}</title>{[-9, 0, 9].map((offset) => <path key={offset} d={`M ${x - 20} ${cy + offset + rise} L ${x + 20} ${cy + offset - rise}`} />)}</g>;
  }
  if (symbolId === "hvac-chiller") return <g className={mark}><circle cx={x} cy={cy} r="15" />{[0, 60, 120].map((angle) => <path key={angle} d={`M ${x - 13} ${cy} H ${x + 13}`} transform={`rotate(${angle} ${x} ${cy})`} />)}</g>;

  if (symbolId === "solar-panel") return <g className={mark}><rect x={x - 20} y={cy - 15} width="40" height="30" rx="2" />{[-7, 7].map((offset) => <path key={offset} d={`M ${x + offset} ${cy - 15} V ${cy + 15} M ${x - 20} ${cy + offset} H ${x + 20}`} />)}</g>;
  if (symbolId === "solar-controller") return <g className={mark}><rect x={x - 21} y={cy - 14} width="42" height="28" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>CC</text></g>;
  if (symbolId === "solar-battery") return <g className={mark}><path d={`M ${x - 24} ${cy} H ${x - 5} M ${x + 5} ${cy} H ${x + 24} M ${x - 5} ${cy - 12} V ${cy + 12} M ${x + 5} ${cy - 7} V ${cy + 7}`} /></g>;
  if (symbolId === "solar-inverter") return <g className={mark}><rect x={x - 23} y={cy - 14} width="46" height="28" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>DC~</text></g>;
  if (symbolId === "solar-grid-tie") return <g className={mark}><path d={`M ${x - 25} ${cy} H ${x - 7} M ${x + 7} ${cy} H ${x + 25} M ${x - 7} ${cy + 10} L ${x + 7} ${cy - 10}`} /><path d={`M ${x + 20} ${cy - 14} V ${cy + 14}`} /></g>;

  if (symbolId === "safety-dual-relay") return <g className={mark} aria-label="Generic dual-channel monitoring relay">
    <rect x={x - 32} y={y - 36} width="64" height="52" rx="4" />
    <path d={`M ${x - 47} ${y - 28} H ${x - 32} M ${x - 47} ${y - 10} H ${x - 32} M ${x - 47} ${y + 8} H ${x - 32} M ${x + 32} ${y - 10} H ${x + 47} M ${x} ${y + 16} V ${y + 25}`} />
    <text x={x} y={y - 5} textAnchor="middle" className={text}>2 CH</text>
  </g>;
  if (symbolId === "safety-relay" || /^safety-relay-\d+$/.test(symbolId)) return <g className={mark} aria-label="Pilz PNOZ X2.7P safety relay, 24 volts AC/DC, three safety normally-open contacts and one auxiliary normally-closed contact">
    <rect x={x - 54} y={y - 47} width="108" height="94" rx="4" />
    {["a1", "a2", "s11", "s52", "s21", "s22", "s12", "s34", "13", "14", "23", "24", "33", "34", "41", "42"].map(terminalId => {
      const offset = controlTerminalOffset("catalog-safety-relay", terminalId)!;
      const lead = terminalId === "a1" || terminalId === "a2" ? `V ${y - 47}` : `H ${x + Math.sign(offset.x) * 54}`;
      return <path key={terminalId} d={`M ${x + offset.x} ${y + offset.y} ${lead}`} />;
    })}
    <text x={x} y={y - 5} textAnchor="middle" className={text}>PILZ</text>
    <text x={x} y={y + 15} textAnchor="middle" className={text}>PNOZ X2.7P</text>
    <path d={`M ${x - 44} ${y - 26} H ${x - 30} M ${x - 30} ${y - 26} L ${x - 20} ${y - 34} M ${x - 10} ${y - 26} H ${x + 4} M ${x + 4} ${y - 26} L ${x + 14} ${y - 34} M ${x + 24} ${y - 26} H ${x + 40} M ${x - 40} ${y + 28} H ${x - 26} M ${x - 26} ${y + 28} H ${x - 10}`} />
  </g>;
  if (symbolId === "safety-light-curtain") return <g className={mark}><path d={`M ${x - 18} ${cy - 16} V ${cy + 16} M ${x + 18} ${cy - 16} V ${cy + 16}`} />{[-8, 0, 8].map((offset) => <path key={offset} d={`M ${x - 13} ${cy + offset} H ${x + 13}`} />)}</g>;
  if (symbolId === "safety-pull-cord") return <g className={mark}><path d={`M ${x - 28} ${cy - 8} H ${x + 18} M ${x + 8} ${cy - 8} V ${cy + 12} M ${x} ${cy + 12} H ${x + 16}`} /></g>;
  if (symbolId === "safety-zero-speed") return <g className={mark}><circle cx={x} cy={cy} r="15" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>0</text></g>;
  if (symbolId === "safety-phase-failure") return <g className={mark}>
    {(["l1", "l2", "l3"] as const).map((phase, index) => {
      const pinX = x + (index - 1) * 24;
      const present = properties[phase] === true;
      return <g key={phase} data-phase-monitor-input={phase} aria-label={phase.toUpperCase() + (present ? " present" : " absent")}>
        <path d={`M ${pinX} ${y - 27} V ${cy - 5}`} />
        <circle cx={pinX} cy={cy} r="5" style={{ fill: present ? "#15803d" : "none" }} />
      </g>;
    })}
    <path d={`M ${x - 24} ${cy + 15} H ${x + 24}`} />
  </g>;
  if (symbolId === "safety-earth-leakage") return <g className={mark}><circle cx={x} cy={cy - 3} r="11" /><path d={`M ${x} ${cy + 8} V ${cy + 16} M ${x - 9} ${cy + 16} H ${x + 9} M ${x - 5} ${cy + 20} H ${x + 5}`} /></g>;

  if (symbolId === "panel-busbar") return <g className={mark}>{[-8, 0, 8].map((offset) => <path key={offset} d={`M ${x - 27} ${cy + offset} H ${x + 27}`} />)}<path d={`M ${x - 20} ${cy + 16} H ${x + 20}`} /></g>;
  if (symbolId === "panel-distribution") return <g className={mark}><rect x={x - 24} y={cy - 15} width="48" height="30" rx="3" />{[-9, 0, 9].map((offset) => <path key={offset} d={`M ${x - 17} ${cy + offset} H ${x + 17}`} />)}</g>;
  if (symbolId === "panel-enclosure") return <g className={mark} aria-label="Panel enclosure">
    <rect x={x - 30} y={cy - 22} width={60} height={44} />
    <rect x={x - 25} y={cy - 17} width={50} height={34} />
    <path d={`M ${x + 18} ${cy - 4} v 8`} />
  </g>;
  if (symbolId === "panel-mounting-plate") return <g className={mark} aria-label="Mounting plate blank">
    <rect x={x - 27} y={cy - 20} width={54} height={40} />
    <path d={`M ${x - 19} ${cy} h 38 M ${x} ${cy - 12} v 24`} strokeDasharray="3 4" />
  </g>;
  if (symbolId === "panel-din-rail") return <g className={mark}><rect x={x - 34} y={cy - 8} width={68} height={16} />{properties.perforated !== false && [-20, 0, 20].map((offset) => <rect key={offset} x={x + offset - 5} y={cy - 2} width={10} height={4} rx={2} />)}</g>;
  if (symbolId === "panel-door-interlock") return <g className={mark}><rect x={x - 18} y={cy - 16} width="24" height="32" /><path d={`M ${x + 6} ${cy} H ${x + 26} M ${x - 8} ${cy} H ${x + 4}`} /><circle cx={x - 3} cy={cy + 7} r="2" /></g>;
  if (symbolId === "panel-stack-light") return <g className={mark} aria-label="Indicator tower stack light">
    <rect x={x - 12} y={y - 27} width="24" height="42" rx="3" />
    <path d={`M ${x - 47} ${y - 18} H ${x - 12} M ${x + 12} ${y - 18} H ${x + 47}
      M ${x - 47} ${y - 6} H ${x - 12} M ${x - 12} ${y - 13} H ${x + 12} M ${x - 12} ${y + 1} H ${x + 12}`} />
    {[["red", "#d5242a"], ["yellow", "#d39700"], ["green", "#18865d"]].map(([channel, color], index) => <circle key={channel} cx={x} cy={y - 20 + index * 14} r="4" fill={color} fillOpacity={properties[channel] === true ? 1 : .22} />)}
  </g>;

  if (symbolId === "cable-multicore") return <g className={mark}><path d={`M ${x - 28} ${cy - 8} H ${x + 28} M ${x - 28} ${cy} H ${x + 28} M ${x - 28} ${cy + 8} H ${x + 28}`} /></g>;
  if (symbolId === "cable-armored") return <g className={mark}><path d={`M ${x - 28} ${cy - 11} H ${x + 28} M ${x - 28} ${cy + 11} H ${x + 28} M ${x - 24} ${cy - 5} L ${x - 16} ${cy + 5} L ${x - 8} ${cy - 5} L ${x} ${cy + 5} L ${x + 8} ${cy - 5} L ${x + 16} ${cy + 5} L ${x + 24} ${cy - 5}`} /></g>;
  if (symbolId === "cable-shielded") return <g className={mark}><path d={`M ${x - 28} ${cy - 12} H ${x + 28} M ${x - 28} ${cy + 12} H ${x + 28} M ${x - 28} ${cy} H ${x + 18}`} /><path d={`M ${x + 18} ${cy - 6} L ${x + 27} ${cy} L ${x + 18} ${cy + 6}`} /></g>;
  if (symbolId === "cable-tray") return <g className={mark} aria-label="Cable tray route"><path d={`M ${x - 47} ${y - 18} H ${x + 47} M ${x - 36} ${y - 32} H ${x + 36} M ${x - 36} ${y - 4} H ${x + 36}`} />{[-24, -8, 8, 24].map((offset) => <path key={offset} d={`M ${x + offset} ${y - 32} V ${y - 4}`} />)}<path d={`M ${x - 47} ${y - 6} H ${x - 36}`} /></g>;
  return <g className={mark} data-symbol-fallback="true"><path d={`M ${x - 28} ${cy - 10} H ${x + 28} M ${x - 20} ${cy} H ${x + 20} M ${x - 28} ${cy + 10} H ${x + 28}`} /></g>;
}

