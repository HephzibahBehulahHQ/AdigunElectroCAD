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

const capacities = {
  D1: [5, 10, 20, 30, 50, 100, 200, 500, 1000],
  C3: [10, 20, 30, 50, 100, 200, 500, 1000],
  C4: [20, 30, 50, 100, 200, 500],
  C6: [20, 30, 50, 100, 200],
} as const;

type AccuracyClass = keyof typeof capacities;
const options = [
  { code: "6", lengthM: 6, jacket: "PVC" },
  { code: "12", lengthM: 12, jacket: "PVC" },
  { code: "DC3", lengthM: 3, jacket: "PUR drag-chain" },
] as const;

function loadCell(design: "F" | "G", accuracyClass: AccuracyClass, capacityKg: number, orderCode: string, option?: typeof options[number]): ElectricalComponentDefinition {
  const series = "Z6" + design + " " + accuracyClass;
  const id = "hbk.z6" + design.toLowerCase() + accuracyClass.toLowerCase() + "." + capacityKg + "kg";
  const cableLengthM = option?.lengthM ?? 3;
  const cableJacket = option?.jacket ?? "PVC";
  return {
    id: option ? id + "." + (option.code === "DC3" ? "dc3" : option.lengthM + "m") : id,
    name: "HBK " + orderCode + " · " + capacityKg + " kg load cell",
    category: "Advanced Sensors & Instrumentation", referencePrefix: "B",
    symbolId: "sensor-load-cell-bridge",
    description: series + " bending-beam load cell with " + cableLengthM + " m " + cableJacket + " cable, sensing leads and housing shield." + (option ? " Manufacturer-defined build-to-order configuration." : ""),
    terminals: leads,
    manufacturerRecord: {
      manufacturer: "HBK", series, orderCode, sourceUrl: dataSheet,
      documentRevision: "B01010 11 E00 04 (2024-08-29), pp. 2–3 and 7–8",
      terminalMap: "verified",
      topology: {
        type: "wheatstone-bridge",
        nodes: [["exc-plus", "sense-plus"], ["exc-minus", "sense-minus"], ["signal"], ["signal-minus"], ["shield"]],
        resistiveBranches: [["exc-plus", "signal"], ["signal", "exc-minus"], ["exc-plus", "signal-minus"], ["signal-minus", "exc-minus"]],
        shieldBond: "housing",
      },
    },
    propertiesSchema: { capacityKg, capacityN: capacityKg * 9.80665, accuracyClass, cableLengthM, cableJacket, forceN: 0, sensitivityMvPerV: 2, excitationV: 5 },
    simulationModelId: "sensor-load-cell", simulationSupport: "numerical",
    documentation: "Ideal differential mV bridge output using configured excitation and force. SIG+ carries the differential result in simulation. Excitation supply wiring, sense feedback, SIG− continuity and shielding are represented for drafting only. Specify excitation within 0.5–12 V. Metrology class does not change the ideal simulation.",
    standardsReferences: ["OIML R60 " + accuracyClass, dataSheet],
  };
}

export const hbkLoadCellCatalog: ElectricalComponentDefinition[] = [
  ...(["D1", "C3", "C4", "C6"] as const).flatMap(accuracy => capacities[accuracy].map(kg =>
    loadCell("F", accuracy, kg, "1-Z6F" + accuracy + "/" + (kg === 1000 ? "1T" : kg + "KG-1")),
  )),
  loadCell("G", "C3", 500, "1-Z6GC3/500KG"),
  ...(["D1", "C3"] as const).flatMap(accuracy => capacities[accuracy].flatMap(kg => options.map(option =>
    loadCell("F", accuracy, kg, "K-Z6-F-" + accuracy + "-" + kg + "-N-" + option.code + "-N", option),
  ))),
];
