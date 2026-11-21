import type { ElectricalComponentDefinition } from "../types/electrical";

/** User-authored schematic symbols with editable connection points. */
export const userSymbolCatalog: ElectricalComponentDefinition[] = [
  {
    id: "user.indicator-lamp",
    name: "Custom indicator lamp",
    category: "User Symbols",
    referencePrefix: "HL",
    description: "A wired pilot indicator with editable voltage rating, AC/DC mode, color and terminal labels.",
    symbolId: "user-indicator-lamp",
    terminals: [
      { id: "t1", label: "T1", kind: "control", direction: "bidirectional" },
      { id: "t2", label: "T2", kind: "control", direction: "bidirectional" },
    ],
    propertiesSchema: { color: "#64748b", indication: "Unassigned", terminalLabel1: "T1", terminalLabel2: "T2", ratedVoltageV: 0, dc: true },
    simulationModelId: "indicator-lamp-v1",
    simulationSupport: "control-logic",
    documentation: "Ideal pilot indication from a complete, correctly rated control circuit across T1 and T2. For DC, T1 is positive. Specify the voltage and AC/DC setting for the intended circuit. Extra user terminals are available for drafting and do not drive the lamp.",
    standardsReferences: ["IEC 60073 (indication coding reference)", "https://webstore.iec.ch/en/publication/587"],
  },
  {
    id: "user.drawn-symbol",
    name: "User-drawn symbol",
    category: "User Symbols",
    referencePrefix: "U",
    description: "A reusable, symbol-only component created from user-drawn schematic geometry.",
    symbolId: "user-drawn-symbol",
    terminals: [
      { id: "t1", label: "T1", kind: "control", direction: "bidirectional" },
      { id: "t2", label: "T2", kind: "control", direction: "bidirectional" },
    ],
    propertiesSchema: { indication: "User symbol", terminalLabel1: "T1", terminalLabel2: "T2" },
    simulationModelId: "user-drawn-symbol",
    simulationSupport: "symbol-only",
    documentation: "User-authored schematic geometry with editable, connectable terminals. No voltage, current, manufacturer, branch assignment, or simulated behavior is assumed.",
    standardsReferences: [],
  },
];
