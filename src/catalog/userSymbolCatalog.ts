import type { ElectricalComponentDefinition } from "../types/electrical";

/** User-authored schematic symbols with editable connection points. */
export const userSymbolCatalog: ElectricalComponentDefinition[] = [
  {
    id: "user.indicator-lamp",
    name: "Custom indicator lamp",
    category: "User Symbols",
    referencePrefix: "HL",
    description: "A user-configured indicator symbol with editable color, text, and two connection terminals.",
    symbolId: "user-indicator-lamp",
    terminals: [
      { id: "t1", label: "T1", kind: "control", direction: "bidirectional" },
      { id: "t2", label: "T2", kind: "control", direction: "bidirectional" },
    ],
    propertiesSchema: { color: "#64748b", indication: "Unassigned", terminalLabel1: "T1", terminalLabel2: "T2" },
    simulationModelId: "user-indicator-symbol",
    simulationSupport: "symbol-only",
    documentation: "User-authored symbol. Choose its indication, color, terminal labels, and wiring. No voltage, current, manufacturer, or simulated lamp behavior is assigned until specified.",
    standardsReferences: [],
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
