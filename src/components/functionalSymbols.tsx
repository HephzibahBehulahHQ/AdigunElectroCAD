const mark = "generic-symbol-mark functional-symbol";
const text = "functional-symbol-text";

export function hasDedicatedFunctionalSymbol(symbolId: string) {
  return ["pushbutton-no", "pushbutton-nc", "control-supply", "contactor-3p", "breaker", "breaker-3p", "overload-3p", "supply-3p", "motor-3p", "motor-3phase"].includes(symbolId) || symbolId === "motor" || symbolId.startsWith("supply-ac-") || (symbolId.startsWith("motor-") && !symbolId.startsWith("motor-ac-")) || symbolId.startsWith("breaker-") || symbolId.startsWith("starter-") || symbolId.startsWith("relay-") || symbolId.startsWith("fuse-") || symbolId.startsWith("transformer-") || symbolId.startsWith("plc-io-") || symbolId.startsWith("vfd-") || symbolId.startsWith("timer-") || symbolId.startsWith("switch-") || symbolId.startsWith("terminal-") || symbolId.startsWith("actuator-") || symbolId.startsWith("meter-") || /^(logic|sensor|signal|pneumatic|hydraulic|hvac|solar|safety|panel|cable|user)-/.test(symbolId);
}

export function FunctionalSymbol({ symbolId, x, y, properties = {} }: { symbolId: string; x: number; y: number; properties?: Record<string, string | number | boolean> }) {
  const cy = y - 13;
  if (!hasDedicatedFunctionalSymbol(symbolId)) return null;

  if (symbolId === "control-supply") return <g className={mark} aria-label="Isolated AC control supply"><circle cx={x} cy={cy} r="13" /><path d={`M ${x - 9} ${cy} Q ${x - 4} ${cy - 12} ${x} ${cy} T ${x + 9} ${cy}`} /></g>;
  if (symbolId === "user-indicator-lamp") {
    const color = typeof properties.color === "string" && /^#[0-9a-f]{6}$/i.test(properties.color) ? properties.color : "#64748b";
    const terminal1 = typeof properties.terminalLabel1 === "string" ? properties.terminalLabel1.slice(0, 8) : "T1";
    const terminal2 = typeof properties.terminalLabel2 === "string" ? properties.terminalLabel2.slice(0, 8) : "T2";
    return <g className={mark} aria-label="User-defined indicator symbol"><path d={`M ${x - 32} ${cy} H ${x - 12} M ${x + 12} ${cy} H ${x + 32}`} /><circle cx={x} cy={cy} r="12" fill={color} fillOpacity=".32" /><path d={`M ${x - 6} ${cy - 6} L ${x + 6} ${cy + 6} M ${x - 6} ${cy + 6} L ${x + 6} ${cy - 6}`} /><text x={x - 24} y={cy + 24} textAnchor="middle" className={text} textLength="32" lengthAdjust="spacingAndGlyphs">{terminal1}</text><text x={x + 24} y={cy + 24} textAnchor="middle" className={text} textLength="32" lengthAdjust="spacingAndGlyphs">{terminal2}</text></g>;
  }
  if (symbolId === "supply-3p" || symbolId.startsWith("supply-ac-")) return <g className={mark} aria-label="Three-phase AC supply"><circle cx={x} cy={y} r="19" /><path d={`M ${x - 11} ${cy} Q ${x - 6} ${cy - 9} ${x} ${cy} T ${x + 11} ${cy}`} /><text x={x} y={y + 20} textAnchor="middle" className={text}>3~</text></g>;
  if (symbolId === "motor" || symbolId === "motor-3p" || symbolId === "motor-3phase" || (symbolId.startsWith("motor-") && !symbolId.startsWith("motor-ac-"))) return <g className={mark} aria-label="Three-phase induction motor"><circle cx={x} cy={y} r="20" /><text x={x} y={y - 1} textAnchor="middle" className={text}>M</text><text x={x} y={y + 13} textAnchor="middle" className={text}>3~</text></g>;
  if (symbolId.startsWith("meter-")) {
    const kind = typeof properties.measurementKind === "string" ? properties.measurementKind : "Voltage";
    const units: Record<string, string> = { Voltage: "V", Current: "A", Power: "W", Frequency: "Hz" };
    const unit = units[kind] ?? "";
    const reading = Number(properties.measuredValue ?? 0);
    const maximum = Math.max(0.001, Number(properties.scaleMaximum ?? 100));
    const ratio = Math.max(0, Math.min(1, reading / maximum));
    const angle = (-140 + ratio * 100) * Math.PI / 180;
    const needleX = x + Math.cos(angle) * 11, needleY = y + Math.sin(angle) * 11;
    return <g className={mark} aria-label={`Digital panel meter, ${kind}, ${Number.isFinite(reading) ? reading.toFixed(1) : "invalid"} ${unit}`}>
      <circle cx={x} cy={y} r="22" />
      <path d={`M ${x - 13} ${y + 9} A 16 16 0 0 1 ${x + 13} ${y + 9} M ${x} ${y + 5} L ${needleX} ${needleY}`} />
      <circle cx={x} cy={y + 5} r="2" />
      <text x={x} y={y + 19} textAnchor="middle" className={text}>{unit}</text>
    </g>;
  }
  if (/^sensor-\\d+$/.test(symbolId)) return <g className={mark} aria-label="Inductive proximity sensor with +24V, SIG and 0V terminals">
    <rect x={x - 24} y={cy - 14} width="38" height="28" rx="3" />
    <path d={`M ${x + 14} ${cy - 9} Q ${x + 24} ${cy} ${x + 14} ${cy + 9} M ${x + 19} ${cy - 14} Q ${x + 34} ${cy} ${x + 19} ${cy + 14}`} />
    <circle cx={x - 13} cy={cy} r="3" />
  </g>;
  if (symbolId.startsWith("actuator-")) {
    const energized = properties.energized === true;
    const plunger = energized ? x + 24 : x + 10;
    const spring = properties.returnSpring === true;
    return <g className={mark} aria-label={`Solenoid actuator, ${energized ? "energized" : "de-energized"}`} data-state={energized ? "energized" : "idle"}>
      <rect x={x - 24} y={y - 17} width="24" height="34" rx="2" />
      <path d={`M ${x - 20} ${y - 10} q 16 5 0 10 q -16 5 0 10 M ${x} ${y} H ${plunger} M ${plunger} ${y - 8} V ${y + 8}${spring ? ` M ${x + 27} ${y - 10} l 4 5 l -8 5 l 8 5 l -4 5` : ""}`} />
    </g>;
  }
  if (symbolId.startsWith("terminal-")) {
    const connected = properties.continuityClosed !== false;
    return <g className={mark} aria-label={`Feed-through terminal block, ${connected ? "connected" : "open"}`} data-state={connected ? "connected" : "open"}>
      <path d={`M ${x - 47} ${y} H ${x - 22} M ${x + 22} ${y} H ${x + 47}`} />
      <rect x={x - 22} y={y - 15} width="44" height="30" rx="2" />
      <path d={connected ? `M ${x - 22} ${y} H ${x + 22}` : `M ${x - 22} ${y} H ${x - 4} M ${x + 4} ${y} H ${x + 22}`} />
      <circle cx={x} cy={y - 7} r="3" />
    </g>;
  }
  if (symbolId.startsWith("switch-")) {
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
  if (symbolId.startsWith("timer-")) {
    const energized = properties.energized === true;
    const timingComplete = energized && Number(properties.elapsedSeconds ?? 0) >= Number(properties.delaySeconds ?? Infinity);
    return <g className={mark} aria-label={`On-delay timer, ${timingComplete ? "timed contact made" : energized ? "timing" : "de-energized"}`} data-state={timingComplete ? "timed" : energized ? "timing" : "idle"}>
      <rect x={x - 38} y={y - 15} width="16" height="30" rx="2" />
      <path d={`M ${x - 35} ${y - 9} q 10 4 0 8 q -10 4 0 8`} />
      <circle cx={x - 1} cy={y - 10} r="11" />
      <path d={`M ${x - 1} ${y - 10} V ${y - 16} M ${x - 1} ${y - 10} L ${x + 5} ${y - 7} M ${x} ${y + 27} V ${y + 3} M ${x + 23} ${y - 12} H ${x + 14} M ${x + 23} ${y + 12} H ${x + 14} M ${x} ${y + 3} L ${x + (timingComplete ? 9 : -9)} ${y + 10}`} />
    </g>;
  }
  if (symbolId.startsWith("vfd-")) return <g className={mark} aria-label="Variable-frequency drive with three-phase input and U/V/W output">
    <rect x={x - 30} y={y - 22} width="60" height="44" rx="2" />
    <path d={`M ${x} ${y - 22} V ${y + 22}`} />
    <text x={x - 15} y={y + 5} textAnchor="middle" className={text}>~</text>
    <text x={x + 15} y={y + 5} textAnchor="middle" className={text}>f</text>
  </g>;
  if (symbolId.startsWith("plc-io-")) return <g className={mark} aria-label="PLC digital and analog I/O module">
    <rect x={x - 25} y={y - 24} width="50" height="48" rx="2" />
    <path d={`M ${x} ${y - 24} V ${y + 24}`} />
    <text x={x - 12} y={y + 4} textAnchor="middle" className={text}>I</text>
    <text x={x + 12} y={y + 4} textAnchor="middle" className={text}>Q</text>
  </g>;
  if (symbolId.startsWith("transformer-")) return <g className={mark} aria-label="Transformer with primary and secondary windings">
    <path d={`M ${x - 8} ${y - 24} C ${x - 22} ${y - 24} ${x - 22} ${y - 16} ${x - 8} ${y - 16} C ${x - 22} ${y - 16} ${x - 22} ${y - 8} ${x - 8} ${y - 8} C ${x - 22} ${y - 8} ${x - 22} ${y} ${x - 8} ${y} C ${x - 22} ${y} ${x - 22} ${y + 8} ${x - 8} ${y + 8} C ${x - 22} ${y + 8} ${x - 22} ${y + 16} ${x - 8} ${y + 16} C ${x - 22} ${y + 16} ${x - 22} ${y + 24} ${x - 8} ${y + 24}`} />
    <path d={`M ${x + 8} ${y - 24} C ${x + 22} ${y - 24} ${x + 22} ${y - 16} ${x + 8} ${y - 16} C ${x + 22} ${y - 16} ${x + 22} ${y - 8} ${x + 8} ${y - 8} C ${x + 22} ${y - 8} ${x + 22} ${y} ${x + 8} ${y} C ${x + 22} ${y} ${x + 22} ${y + 8} ${x + 8} ${y + 8} C ${x + 22} ${y + 8} ${x + 22} ${y + 16} ${x + 8} ${y + 16} C ${x + 22} ${y + 16} ${x + 22} ${y + 24} ${x + 8} ${y + 24}`} />
    <path d={`M ${x - 2} ${y - 27} V ${y + 27} M ${x + 2} ${y - 27} V ${y + 27}`} />
  </g>;
  if (symbolId.startsWith("fuse-")) {
    const healthy = properties.fuseHealthy !== false;
    return <g className={mark} aria-label={`Three-pole fuse switch, ${healthy ? "healthy" : "fuse open"}`} data-state={healthy ? "healthy" : "open"}>
      {[-32, 0, 32].map(offset => <g key={offset}>
        <path d={`M ${x + offset} ${y - 27} V ${y - 10} M ${x + offset} ${y + 10} V ${y + 27}`} />
        <rect x={x + offset - 5} y={y - 10} width="10" height="20" />
        <path d={healthy ? `M ${x + offset - 2} ${y + 7} L ${x + offset + 2} ${y - 7}` : `M ${x + offset} ${y - 6} V ${y + 6}`} />
      </g>)}
    </g>;
  }
  if (symbolId.startsWith("relay-")) {
    const contacts = Math.max(1, Math.min(3, Number(properties.changeoverContacts) || 1));
    const energized = properties.energized === true;
    const columns = [-30, 0, 30].slice(0, contacts);
    return <g className={mark} aria-label={`Interface relay with ${contacts} changeover contact${contacts === 1 ? "" : "s"}, ${energized ? "energized" : "de-energized"}`} data-state={energized ? "energized" : "de-energized"}>
      <rect x={x - 43} y={y - 15} width="16" height="30" rx="2" />
      <path d={`M ${x - 39} ${y - 8} q 8 4 0 8 q -8 4 0 8`} />
      {columns.map((column, index) => <g key={index}>
        <path d={`M ${x + column} ${y - 27} V ${y - 2} M ${x + column - 8} ${y + 27} V ${y + 9} M ${x + column + 8} ${y + 27} V ${y + 9} M ${x + column} ${y - 2} L ${x + column + (energized ? 5 : -5)} ${y + 8}`} />
        <path d={`M ${x + column - 8} ${y + 8} H ${x + column - 2} M ${x + column + 2} ${y + 8} H ${x + column + 8}`} />
      </g>)}
    </g>;
  }
  if (symbolId === "breaker" || symbolId === "breaker-3p" || symbolId.startsWith("breaker-")) {
    const closed = properties.closed === true;
    const poles = Number(properties.poles) === 4 ? 4 : 3;
    const offsets = poles === 4 ? [-36, -12, 12, 36] : [-32, 0, 32];
    return <g className={mark} aria-label={`${poles === 4 ? "4" : "Three"}-pole circuit breaker, ${closed ? "closed" : "open"}`} data-state={closed ? "closed" : "open"}>
      {offsets.map(offset => <g key={offset}><path d={`M ${x + offset} ${y - 27} V ${y - 12} M ${x + offset - 7} ${y - 12} H ${x + offset - 2} M ${closed ? `M ${x + offset - 2} ${y - 12} V ${y + 8}` : `M ${x + offset - 2} ${y - 12} L ${x + offset + 7} ${y + 1}`} M ${x + offset + 2} ${y + 8} H ${x + offset + 7} V ${y + 27}`} /></g>)}
    </g>;
  }
  if (symbolId === "overload-3p") {
    const tripped = properties.tripped === true || properties.runtimeThermalTripped === true;
    return <g className={mark} aria-label={`Three-phase thermal overload relay, ${tripped ? "tripped" : "not tripped"}`} data-state={tripped ? "tripped" : "healthy"}>
      {[-32, 0, 32].map(offset => <g key={offset}><path d={`M ${x + offset} ${y - 27} V ${y - 12} M ${x + offset} ${y - 12} L ${x + offset - 5} ${y - 7} L ${x + offset + 5} ${y - 2} L ${x + offset - 5} ${y + 3} L ${x + offset + 5} ${y + 8} L ${x + offset} ${y + 12} V ${y + 27}`} /></g>)}
      <circle cx={x + 19} cy={y + 18} r="3" fill={tripped ? "#c62828" : "#16824a"} aria-label={tripped ? "Tripped" : "Healthy"} />
    </g>;
  }
  if (symbolId === "contactor-3p" || symbolId.startsWith("starter-")) return <g className={mark} aria-label={`Motor starter with three main poles and ${Number(properties.auxiliaryNoContacts) || 0} auxiliary NO contacts`}><rect x={x - 16} y={y - 4} width="32" height="16" />{[-24, 0, 24].map(offset => <path key={offset} d={`M ${x + offset - 5} ${y - 22} L ${x + offset + 5} ${y - 10}`} />)}</g>;
  if (symbolId === "pushbutton-no" || symbolId === "pushbutton-nc") return <g className={mark} aria-label={symbolId === "pushbutton-no" ? "Normally open pushbutton" : "Normally closed pushbutton"}><path d={`M ${x - 28} ${cy} H ${x - 9} M ${x + 9} ${cy} H ${x + 28} M ${x} ${cy - 6} V ${cy - 14} M ${x - 8} ${cy - 14} H ${x + 8}`} /><path d={symbolId === "pushbutton-no" ? `M ${x - 9} ${cy - 6} H ${x + 9}` : `M ${x - 9} ${cy} H ${x + 9} M ${x - 10} ${cy + 8} L ${x + 10} ${cy - 8}`} /></g>;
  if (symbolId === "logic-no" || symbolId === "logic-nc") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 7} M ${x + 7} ${cy} H ${x + 28}`} /><path d={symbolId === "logic-no" ? `M ${x - 6} ${cy + 10} L ${x + 6} ${cy - 10}` : `M ${x - 7} ${cy} H ${x + 7} M ${x - 8} ${cy + 11} L ${x + 8} ${cy - 11}`} /></g>;
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
  if (symbolId === "sensor-thermocouple") return <g className={mark}><path d={`M ${x - 24} ${cy - 12} V ${cy + 12} M ${x + 24} ${cy - 12} V ${cy + 12} M ${x - 16} ${cy - 12} L ${x + 16} ${cy + 12}`} /><circle cx={x} cy={cy} r="4" /></g>;
  if (symbolId === "sensor-flow") return <g className={mark}><circle cx={x} cy={cy} r="14" /><path d={`M ${x - 28} ${cy} H ${x + 20} M ${x + 13} ${cy - 7} L ${x + 20} ${cy} L ${x + 13} ${cy + 7}`} /></g>;
  if (symbolId === "sensor-level") return <g className={mark}><path d={`M ${x - 15} ${cy - 17} V ${cy + 17} H ${x + 15} V ${cy - 17}`} /><path d={`M ${x - 13} ${cy + 7} H ${x + 13}`} /></g>;
  if (symbolId === "sensor-vibration") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 20} L ${x - 13} ${cy - 12} L ${x - 3} ${cy + 12} L ${x + 7} ${cy - 12} L ${x + 17} ${cy + 12} L ${x + 25} ${cy}`} /></g>;
  if (symbolId === "sensor-encoder") return <g className={mark}><circle cx={x} cy={cy} r="14" />{[0, 90, 180, 270].map((angle) => <path key={angle} d={`M ${x} ${cy - 14} V ${cy - 8}`} transform={`rotate(${angle} ${x} ${cy})`} />)}<circle cx={x} cy={cy} r="3" /></g>;
  if (symbolId === "sensor-load-cell") return <g className={mark}><path d={`M ${x - 25} ${cy - 10} H ${x + 25} M ${x - 16} ${cy + 10} H ${x + 16}`} /><path d={`M ${x - 12} ${cy - 10} L ${x - 6} ${cy + 10} M ${x + 12} ${cy - 10} L ${x + 6} ${cy + 10}`} /></g>;
  if (symbolId === "sensor-ct") return <g className={mark}><circle cx={x} cy={cy} r="14" /><path d={`M ${x - 28} ${cy} H ${x + 28}`} /><text x={x} y={cy + 5} textAnchor="middle" className={text}>CT</text></g>;
  if (symbolId === "signal-adc" || symbolId === "signal-dac") return <g className={mark}><rect x={x - 24} y={cy - 15} width="48" height="30" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>{symbolId === "signal-adc" ? "A/D" : "D/A"}</text></g>;

  if (symbolId.startsWith("pneumatic-valve-")) return <g className={mark}>{symbolId.endsWith("5-2") ? <><rect x={x - 26} y={cy - 15} width="26" height="30" /><rect x={x} y={cy - 15} width="26" height="30" /><path d={`M ${x - 22} ${cy + 8} L ${x - 4} ${cy - 8} M ${x + 4} ${cy - 8} L ${x + 22} ${cy + 8}`} /></> : <><rect x={x - 18} y={cy - 15} width="36" height="30" /><path d={`M ${x - 13} ${cy + 8} L ${x + 13} ${cy - 8} M ${x} ${cy - 15} V ${cy + 15}`} /></>}<circle cx={x - 32} cy={cy} r="4" /><circle cx={x + 32} cy={cy} r="4" /></g>;
  if (symbolId.startsWith("pneumatic-cylinder-")) return <g className={mark}><rect x={x - 24} y={cy - 12} width="34" height="24" /><path d={`M ${x + 10} ${cy} H ${x + 28}`} />{symbolId.endsWith("single") ? <path d={`M ${x - 18} ${cy - 8} L ${x - 10} ${cy + 8} L ${x - 2} ${cy - 8} L ${x + 6} ${cy + 8}`} /> : <path d={`M ${x - 24} ${cy} H ${x + 10}`} />}</g>;
  if (symbolId === "hydraulic-pump") return <g className={mark}><circle cx={x} cy={cy} r="15" /><path d={`M ${x - 8} ${cy + 9} L ${x + 9} ${cy} L ${x - 8} ${cy - 9} Z`} /></g>;
  if (symbolId === "hydraulic-cylinder") return <g className={mark}><rect x={x - 24} y={cy - 12} width="34" height="24" /><path d={`M ${x + 10} ${cy} H ${x + 28} M ${x - 24} ${cy} H ${x + 2}`} /></g>;
  if (symbolId === "hydraulic-relief") return <g className={mark}><path d={`M ${x - 25} ${cy} H ${x - 9} M ${x + 9} ${cy} H ${x + 25} M ${x - 9} ${cy - 10} L ${x + 9} ${cy + 10}`} /><path d={`M ${x - 14} ${cy - 15} L ${x - 7} ${cy - 9} L ${x - 14} ${cy - 3} L ${x - 7} ${cy + 3}`} /></g>;
  if (symbolId === "pneumatic-compressor") return <g className={mark}><circle cx={x} cy={cy} r="15" /><path d={`M ${x - 8} ${cy + 9} L ${x + 9} ${cy} L ${x - 8} ${cy - 9} Z`} /><path d={`M ${x + 15} ${cy} H ${x + 27}`} /></g>;
  if (symbolId === "pneumatic-frl") return <g className={mark}>{[-18, 0, 18].map((offset) => <rect key={offset} x={x + offset - 7} y={cy - 12} width="14" height="24" rx="2" />)}<path d={`M ${x - 18} ${cy - 8} L ${x - 18} ${cy + 8} M ${x} ${cy - 8} L ${x} ${cy + 8}`} /></g>;

  if (symbolId === "hvac-heater" || symbolId === "panel-heater") return <g className={mark}><path d={`M ${x - 26} ${cy} H ${x - 17} L ${x - 9} ${cy - 12} L ${x} ${cy + 12} L ${x + 9} ${cy - 12} L ${x + 17} ${cy} H ${x + 26}`} /></g>;
  if (symbolId === "hvac-fan" || symbolId === "panel-fan") return <g className={mark}><circle cx={x} cy={cy} r="15" />{[0, 120, 240].map((angle) => <path key={angle} d={`M ${x} ${cy} C ${x + 14} ${cy - 3} ${x + 15} ${cy - 12} ${x + 4} ${cy - 13}`} transform={`rotate(${angle} ${x} ${cy})`} />)}</g>;
  if (symbolId === "hvac-thermostat" || symbolId === "hvac-humidistat") return <g className={mark}><circle cx={x} cy={cy} r="14" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>{symbolId.endsWith("thermostat") ? "T" : "H"}</text></g>;
  if (symbolId === "hvac-damper") return <g className={mark}>{[-9, 0, 9].map((offset) => <path key={offset} d={`M ${x - 20} ${cy + offset} L ${x + 20} ${cy + offset - 8}`} />)}</g>;
  if (symbolId === "hvac-chiller") return <g className={mark}><circle cx={x} cy={cy} r="15" />{[0, 60, 120].map((angle) => <path key={angle} d={`M ${x - 13} ${cy} H ${x + 13}`} transform={`rotate(${angle} ${x} ${cy})`} />)}</g>;

  if (symbolId === "solar-panel") return <g className={mark}><rect x={x - 20} y={cy - 15} width="40" height="30" rx="2" />{[-7, 7].map((offset) => <path key={offset} d={`M ${x + offset} ${cy - 15} V ${cy + 15} M ${x - 20} ${cy + offset} H ${x + 20}`} />)}</g>;
  if (symbolId === "solar-controller") return <g className={mark}><rect x={x - 21} y={cy - 14} width="42" height="28" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>CC</text></g>;
  if (symbolId === "solar-battery") return <g className={mark}><path d={`M ${x - 24} ${cy} H ${x - 5} M ${x + 5} ${cy} H ${x + 24} M ${x - 5} ${cy - 12} V ${cy + 12} M ${x + 5} ${cy - 7} V ${cy + 7}`} /></g>;
  if (symbolId === "solar-inverter") return <g className={mark}><rect x={x - 23} y={cy - 14} width="46" height="28" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>DC~</text></g>;
  if (symbolId === "solar-grid-tie") return <g className={mark}><path d={`M ${x - 25} ${cy} H ${x - 7} M ${x + 7} ${cy} H ${x + 25} M ${x - 7} ${cy + 10} L ${x + 7} ${cy - 10}`} /><path d={`M ${x + 20} ${cy - 14} V ${cy + 14}`} /></g>;

  if (symbolId === "safety-relay") return <g className={mark}><rect x={x - 24} y={cy - 15} width="48" height="30" rx="3" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>SR</text></g>;
  if (symbolId === "safety-light-curtain") return <g className={mark}><path d={`M ${x - 18} ${cy - 16} V ${cy + 16} M ${x + 18} ${cy - 16} V ${cy + 16}`} />{[-8, 0, 8].map((offset) => <path key={offset} d={`M ${x - 13} ${cy + offset} H ${x + 13}`} />)}</g>;
  if (symbolId === "safety-pull-cord") return <g className={mark}><path d={`M ${x - 28} ${cy - 8} H ${x + 18} M ${x + 8} ${cy - 8} V ${cy + 12} M ${x} ${cy + 12} H ${x + 16}`} /></g>;
  if (symbolId === "safety-zero-speed") return <g className={mark}><circle cx={x} cy={cy} r="15" /><text x={x} y={cy + 5} textAnchor="middle" className={text}>0</text></g>;
  if (symbolId === "safety-phase-failure") return <g className={mark}>{[-12, 0, 12].map((offset) => <circle key={offset} cx={x + offset} cy={cy} r="5" />)}<path d={`M ${x - 24} ${cy + 15} H ${x + 24}`} /></g>;
  if (symbolId === "safety-earth-leakage") return <g className={mark}><circle cx={x} cy={cy - 3} r="11" /><path d={`M ${x} ${cy + 8} V ${cy + 16} M ${x - 9} ${cy + 16} H ${x + 9} M ${x - 5} ${cy + 20} H ${x + 5}`} /></g>;

  if (symbolId === "panel-busbar") return <g className={mark}>{[-8, 0, 8].map((offset) => <path key={offset} d={`M ${x - 27} ${cy + offset} H ${x + 27}`} />)}<path d={`M ${x - 20} ${cy + 16} H ${x + 20}`} /></g>;
  if (symbolId === "panel-distribution") return <g className={mark}><rect x={x - 24} y={cy - 15} width="48" height="30" rx="3" />{[-9, 0, 9].map((offset) => <path key={offset} d={`M ${x - 17} ${cy + offset} H ${x + 17}`} />)}</g>;
  if (symbolId === "panel-din-rail") return <g className={mark}><path d={`M ${x - 28} ${cy - 8} H ${x + 28} M ${x - 28} ${cy + 8} H ${x + 28}`} />{[-16, 0, 16].map((offset) => <path key={offset} d={`M ${x + offset} ${cy - 8} V ${cy + 8}`} />)}</g>;
  if (symbolId === "panel-door-interlock") return <g className={mark}><rect x={x - 18} y={cy - 16} width="24" height="32" /><path d={`M ${x + 6} ${cy} H ${x + 26} M ${x - 8} ${cy} H ${x + 4}`} /><circle cx={x - 3} cy={cy + 7} r="2" /></g>;
  if (symbolId === "panel-stack-light") return <g className={mark}>{["#d5242a", "#d39700", "#18865d"].map((color, index) => <circle key={color} cx={x} cy={cy - 10 + index * 10} r="4" fill={color} stroke="currentColor" />)}<path d={`M ${x - 9} ${cy + 16} H ${x + 9}`} /></g>;

  if (symbolId === "cable-multicore") return <g className={mark}><path d={`M ${x - 28} ${cy - 8} H ${x + 28} M ${x - 28} ${cy} H ${x + 28} M ${x - 28} ${cy + 8} H ${x + 28}`} /></g>;
  if (symbolId === "cable-armored") return <g className={mark}><path d={`M ${x - 28} ${cy - 11} H ${x + 28} M ${x - 28} ${cy + 11} H ${x + 28} M ${x - 24} ${cy - 5} L ${x - 16} ${cy + 5} L ${x - 8} ${cy - 5} L ${x} ${cy + 5} L ${x + 8} ${cy - 5} L ${x + 16} ${cy + 5} L ${x + 24} ${cy - 5}`} /></g>;
  if (symbolId === "cable-shielded") return <g className={mark}><path d={`M ${x - 28} ${cy - 12} H ${x + 28} M ${x - 28} ${cy + 12} H ${x + 28} M ${x - 28} ${cy} H ${x + 18}`} /><path d={`M ${x + 18} ${cy - 6} L ${x + 27} ${cy} L ${x + 18} ${cy + 6}`} /></g>;
  return <g className={mark}><path d={`M ${x - 28} ${cy - 10} H ${x + 28} M ${x - 20} ${cy} H ${x + 20} M ${x - 28} ${cy + 10} H ${x + 28}`} /></g>;
}

