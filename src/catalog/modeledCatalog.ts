import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

type ModeledFamily = {
  id: string;
  name: string;
  category: string;
  referencePrefix: string;
  symbolId: string;
  standardsReference: string;
  terminals: TerminalDefinition[];
  series: string;
};

const power3 = (): TerminalDefinition[] => [
  { id: "l1-in", label: "L1", kind: "power", direction: "input" }, { id: "l2-in", label: "L2", kind: "power", direction: "input" }, { id: "l3-in", label: "L3", kind: "power", direction: "input" },
  { id: "l1-out", label: "T1", kind: "power", direction: "output" }, { id: "l2-out", label: "T2", kind: "power", direction: "output" }, { id: "l3-out", label: "T3", kind: "power", direction: "output" },
];
const control2 = (): TerminalDefinition[] => [{ id: "a1", label: "A1", kind: "control", direction: "bidirectional" }, { id: "a2", label: "A2", kind: "control", direction: "bidirectional" }];
const signal3 = (): TerminalDefinition[] => [{ id: "supply", label: "+24V", kind: "control", direction: "input" }, { id: "signal", label: "SIG", kind: "control", direction: "output" }, { id: "common", label: "0V", kind: "control", direction: "bidirectional" }];

const families: ModeledFamily[] = [
  { id: "ac-supply", name: "AC supply", category: "Power Supply", referencePrefix: "X", symbolId: "supply-ac", standardsReference: "IEC 60038", terminals: [...power3(), { id: "pe", label: "PE", kind: "protective-earth", direction: "bidirectional" }], series: "400 V / 50 Hz" },
  { id: "circuit-breaker", name: "Circuit breaker", category: "Circuit Breakers", referencePrefix: "Q", symbolId: "breaker", standardsReference: "IEC 60947-2", terminals: power3(), series: "3-pole" },
  { id: "fuse-switch", name: "Fuse switch", category: "Protection Devices", referencePrefix: "F", symbolId: "fuse", standardsReference: "IEC 60269", terminals: power3(), series: "gG" },
  { id: "motor-starter", name: "Motor starter", category: "Contactors & Starters", referencePrefix: "KM", symbolId: "starter", standardsReference: "IEC 60947-4-1", terminals: [...power3(), ...control2()], series: "3-pole" },
  { id: "interface-relay", name: "Interface relay", category: "Relays", referencePrefix: "K", symbolId: "relay", standardsReference: "IEC 61810-1", terminals: [...control2(), { id: "13", label: "13", kind: "control", direction: "bidirectional" }, { id: "14", label: "14", kind: "control", direction: "bidirectional" }], series: "24 V DC" },
  { id: "selector-switch", name: "Selector switch", category: "Switches & Pushbuttons", referencePrefix: "S", symbolId: "switch", standardsReference: "IEC 60947-5-1", terminals: [{ id: "13", label: "13", kind: "control", direction: "bidirectional" }, { id: "14", label: "14", kind: "control", direction: "bidirectional" }], series: "2-position" },
  { id: "induction-motor", name: "Induction motor", category: "Motors", referencePrefix: "M", symbolId: "motor", standardsReference: "IEC 60034-1", terminals: [{ id: "u1", label: "U1", kind: "power", direction: "input" }, { id: "v1", label: "V1", kind: "power", direction: "input" }, { id: "w1", label: "W1", kind: "power", direction: "input" }, { id: "pe", label: "PE", kind: "protective-earth", direction: "bidirectional" }], series: "3~" },
  { id: "control-transformer", name: "Control transformer", category: "Transformers", referencePrefix: "T", symbolId: "transformer", standardsReference: "IEC 61558-2-2", terminals: [{ id: "p1", label: "P1", kind: "power", direction: "input" }, { id: "p2", label: "P2", kind: "power", direction: "input" }, { id: "s1", label: "S1", kind: "control", direction: "output" }, { id: "s2", label: "S2", kind: "control", direction: "output" }], series: "control" },
  { id: "proximity-sensor", name: "Proximity sensor", category: "Sensors", referencePrefix: "B", symbolId: "sensor", standardsReference: "IEC 60947-5-2", terminals: signal3(), series: "PNP" },
  { id: "plc-digital-io", name: "PLC digital I/O module", category: "PLC & I/O", referencePrefix: "PLC", symbolId: "plc-io", standardsReference: "IEC 61131-2", terminals: [{ id: "in-0", label: "I0", kind: "control", direction: "input" }, { id: "in-1", label: "I1", kind: "control", direction: "input" }, { id: "out-0", label: "Q0", kind: "control", direction: "output" }, { id: "common", label: "COM", kind: "control", direction: "bidirectional" }], series: "24 V DC" },
  { id: "on-delay-timer", name: "On-delay timer", category: "Timers & Counters", referencePrefix: "KT", symbolId: "timer", standardsReference: "IEC 61812-1", terminals: [...control2(), { id: "15", label: "15", kind: "control", direction: "bidirectional" }, { id: "18", label: "18", kind: "control", direction: "bidirectional" }], series: "ON-delay" },
  { id: "feed-through-terminal", name: "Feed-through terminal", category: "Terminal Blocks", referencePrefix: "X", symbolId: "terminal", standardsReference: "IEC 60947-7-1", terminals: [{ id: "1", label: "1", kind: "control", direction: "bidirectional" }, { id: "2", label: "2", kind: "control", direction: "bidirectional" }], series: "DIN rail" },
  { id: "multimeter", name: "Panel meter", category: "Measuring & Indication", referencePrefix: "P", symbolId: "meter", standardsReference: "IEC 61557", terminals: signal3(), series: "digital" },
  { id: "variable-frequency-drive", name: "Variable-frequency drive", category: "Drives & Power Electronics", referencePrefix: "U", symbolId: "vfd", standardsReference: "IEC 61800-5-1", terminals: [...power3(), ...control2()], series: "3~ drive" },
  { id: "solenoid-actuator", name: "Solenoid actuator", category: "Industrial Loads & Actuators", referencePrefix: "Y", symbolId: "actuator", standardsReference: "IEC 60204-1", terminals: control2(), series: "24 V DC" },
  { id: "safety-relay", name: "Safety relay", category: "Safety & Signalling", referencePrefix: "K", symbolId: "safety-relay", standardsReference: "IEC 62061", terminals: [...control2(), { id: "s11", label: "S11", kind: "control", direction: "input" }, { id: "s12", label: "S12", kind: "control", direction: "input" }], series: "dual-channel" },
];

export const modeledCatalog: ElectricalComponentDefinition[] = families.flatMap((family) => Array.from({ length: 32 }, (_, index) => {
  const variant = String(index + 1).padStart(2, "0");
  return {
    id: `iec.${family.id}.${variant}`,
    name: `${family.name} ${family.series} ${variant}`,
    category: family.category,
    referencePrefix: family.referencePrefix,
    description: `Generic IEC-oriented ${family.name.toLowerCase()} template, series ${family.series}, variant ${variant}.`,
    symbolId: `${family.symbolId}-${variant}`,
    terminals: family.terminals.map((terminal) => ({ ...terminal })),
    propertiesSchema: { modeledVariant: variant, series: family.series, manufacturerDataVerified: false },
    simulationModelId: `symbol-only-${family.id}`,
    simulationSupport: "symbol-only",
    documentation: "Schema-validated generic IEC-oriented symbol template. It is not a manufacturer-certified device record or a process simulation model.",
    standardsReferences: [family.standardsReference],
  };
}));
