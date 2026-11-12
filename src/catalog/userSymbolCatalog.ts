import type { ElectricalComponentDefinition } from "../types/electrical";

/** Generic schematic placeholders configured by the project author. */
export const userSymbolCatalog: ElectricalComponentDefinition[] = [
  {
    id: "user.indicator-lamp",
    name: "User-defined indicator",
    category: "User Symbols",
    referencePrefix: "HL",
    description: "A generic, user-configured indicator symbol with two editable terminal labels.",
    symbolId: "user-indicator-lamp",
    terminals: [
      { id: "t1", label: "T1", kind: "control", direction: "bidirectional" },
      { id: "t2", label: "T2", kind: "control", direction: "bidirectional" },
    ],
    propertiesSchema: {
      color: "#64748b",
      indication: "Unassigned",
      terminalLabel1: "T1",
      terminalLabel2: "T2",
    },
    simulationModelId: "user-indicator-symbol",
    simulationSupport: "symbol-only",
    documentation: "Symbol-only placeholder. The project author chooses the indication, color, terminal labels, and wiring. No voltage, current, manufacturer, or simulated lamp behavior is assumed.",
    standardsReferences: [],
  },
];
