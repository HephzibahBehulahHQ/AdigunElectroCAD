import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const dataSheet = "https://www.hbm.com/fileadmin/mediapool/hbmdoc/technical/B01010.pdf";
const leads: TerminalDefinition[] = [
  { id: "exc-plus", label: "EXC+", kind: "control", direction: "input", leadColor: "blue", position: { x: -47, y: -26 } },
  { id: "exc-minus", label: "EXC−", kind: "control", direction: "input", leadColor: "black", position: { x: -47, y: -8 } },
  { id: "sense-plus", label: "SEN+", kind: "control", direction: "output", leadColor: "green", position: { x: -47, y: 10 } },
  { id: "sense-minus", label: "SEN−", kind: "control", direction: "output", leadColor: "gray", position: { x: -47, y: 28 } },
  { id: "signal", label: "SIG+", kind: "control", direction: "output", leadColor: "white", position: { x: 47, y: -26 } },
  { id: "signal-minus", label: "SIG−", kind: "control", direction: "output", leadColor: "red", position: { x: 47, y: -8 } },
  { id: "shield", label: "SH", kind: "shield", direction: "bidirectional", position: { x: 47, y: 10 } },
];

const orders = [
  [10, "1-Z6FC3/10KG-1"], [20, "1-Z6FC3/20KG-1"], [30, "1-Z6FC3/30KG-1"],
  [50, "1-Z6FC3/50KG-1"], [100, "1-Z6FC3/100KG-1"], [200, "1-Z6FC3/200KG-1"],
  [500, "1-Z6FC3/500KG-1"], [1000, "1-Z6FC3/1T"],
] as const;

export const hbkLoadCellCatalog: ElectricalComponentDefinition[] = orders.map(([capacityKg, orderCode]) => ({
  id: "hbk.z6fc3." + capacityKg + "kg",
  name: "HBK " + orderCode + " · " + capacityKg + " kg load cell",
  category: "Advanced Sensors & Instrumentation", referencePrefix: "B",
  symbolId: "sensor-load-cell-bridge",
  description: "Z6F C3 bending-beam strain-gauge load cell with remote-sense leads and housing shield.",
  terminals: leads,
  manufacturerRecord: {
    manufacturer: "HBK", series: "Z6F C3", orderCode, sourceUrl: dataSheet,
    documentRevision: "B01010 11 E00 04 (2024-08-29), pp. 2–3 and ordering table",
    terminalMap: "verified",
    topology: {
      type: "wheatstone-bridge",
      nodes: [["exc-plus", "sense-plus"], ["exc-minus", "sense-minus"], ["signal"], ["signal-minus"], ["shield"]],
      resistiveBranches: [["exc-plus", "signal"], ["signal", "exc-minus"], ["exc-plus", "signal-minus"], ["signal-minus", "exc-minus"]],
      shieldBond: "housing",
    },
  },
  propertiesSchema: { capacityKg, capacityN: capacityKg * 9.80665, forceN: 0, sensitivityMvPerV: 2, excitationV: 5 },
  simulationModelId: "sensor-load-cell", simulationSupport: "numerical",
  documentation: "Ideal differential mV bridge output using configured excitation and force. SIG+ carries the differential result in simulation. Excitation supply wiring, sense feedback, SIG− continuity and shielding are represented for drafting only. Specify excitation within 0.5–12 V.",
  standardsReferences: ["OIML R60 C3", dataSheet],
}));
