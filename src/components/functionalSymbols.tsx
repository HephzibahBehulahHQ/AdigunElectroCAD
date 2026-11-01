const mark = "generic-symbol-mark functional-symbol";
const text = "functional-symbol-text";

export function hasDedicatedFunctionalSymbol(symbolId: string) {
  return /^(logic|sensor|signal|pneumatic|hydraulic|hvac|solar|safety|panel|cable)-/.test(symbolId);
}

export function FunctionalSymbol({ symbolId, x, y }: { symbolId: string; x: number; y: number }) {
  const cy = y - 13;
  if (!hasDedicatedFunctionalSymbol(symbolId)) return null;

  if (symbolId === "logic-no" || symbolId === "logic-nc") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 7} M ${x + 7} ${cy} H ${x + 28}`} /><path d={symbolId === "logic-no" ? `M ${x - 6} ${cy + 10} L ${x + 6} ${cy - 10}` : `M ${x - 7} ${cy} H ${x + 7} M ${x - 8} ${cy + 11} L ${x + 8} ${cy - 11}`} /></g>;
  if (symbolId === "logic-coil" || symbolId === "logic-set" || symbolId === "logic-reset") return <g className={mark}><path d={`M ${x - 28} ${cy} H ${x - 15} M ${x + 15} ${cy} H ${x + 28}`} /><path d={`M ${x - 15} ${cy - 12} Q ${x} ${cy} ${x - 15} ${cy + 12} M ${x + 15} ${cy - 12} Q ${x} ${cy} ${x + 15} ${cy + 12}`} />{symbolId !== "logic-coil" && <text x={x} y={cy + 4} textAnchor="middle" className={text}>{symbolId === "logic-set" ? "S" : "R"}</text>}</g>;
  if (symbolId.startsWith("logic-edge-")) return <g className={mark}><path d={`M ${x - 27} ${cy + 8} H ${x - 6} V ${cy - 9} H ${x + 27}`} />{symbolId.endsWith("positive") ? <path d={`M ${x + 7} ${cy - 18} V ${cy - 5} M ${x + 2} ${cy - 10} L ${x + 7} ${cy - 5} L ${x + 12} ${cy - 10}`} /> : <path d={`M ${x + 7} ${cy + 18} V ${cy + 5} M ${x + 2} ${cy + 10} L ${x + 7} ${cy + 5} L ${x + 12} ${cy + 10}`} />}</g>;
  if (symbolId.startsWith("logic-gate-")) { const label = symbolId.replace("logic-gate-", "").toUpperCase().replace("AND", "&").replace("OR", "≥1").replace("NOT", "1").replace("NAND", "&¬").replace("NOR", "≥1¬").replace("XOR", "=1"); return <g className={mark}><path d={`M ${x - 26} ${cy - 16} H ${x + 4} Q ${x + 26} ${cy} ${x + 4} ${cy + 16} H ${x - 26} Z`} /><text x={x - 1} y={cy + 4} textAnchor="middle" className={text}>{label}</text></g>; }
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
