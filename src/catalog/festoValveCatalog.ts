import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const manual = "https://www.festo.com/media/catalog/205267_documentation.pdf";
const variants = [
  ["560697", "VOVG-L10-M32C-AH-M5-1H2", false, "horizontal"],
  ["560698", "VOVG-L10-M32C-AH-M5-1H3", false, "vertical"],
  ["560699", "VOVG-L10-M32U-AH-M5-1H2", true, "horizontal"],
  ["560700", "VOVG-L10-M32U-AH-M5-1H3", true, "vertical"],
  ["560703", "VOVG-S12-M32C-AH-M5-1H2", false, "horizontal"],
  ["560704", "VOVG-S12-M32C-AH-M5-1H3", false, "vertical"],
  ["560705", "VOVG-S12-M32U-AH-M5-1H2", true, "horizontal"],
  ["560706", "VOVG-S12-M32U-AH-M5-1H3", true, "vertical"],
  ["560709", "VOVG-B12-M32C-AH-F-1H2", false, "horizontal"],
  ["560710", "VOVG-B12-M32C-AH-F-1H3", false, "vertical"],
  ["560711", "VOVG-B12-M32U-AH-F-1H2", true, "horizontal"],
  ["560712", "VOVG-B12-M32U-AH-F-1H3", true, "vertical"],
  ["560701", "VOVG-L12-M52Q-AH-M5-1H2", "five-way", "horizontal"],
  ["560702", "VOVG-L12-M52Q-AH-M5-1H3", "five-way", "vertical"],
  ["560707", "VOVG-S12-M52Q-AH-M5-1H2", "five-way", "horizontal"],
  ["560708", "VOVG-S12-M52Q-AH-M5-1H3", "five-way", "vertical"],
  ["560713", "VOVG-B12-M52Q-AH-F-1H2", "five-way", "horizontal"],
  ["560714", "VOVG-B12-M52Q-AH-F-1H3", "five-way", "vertical"],
] as const;

const terminals: TerminalDefinition[] = [
  { id: "a1", label: "X1.1", kind: "control", direction: "bidirectional", position: { x: -52, y: -11 } },
  { id: "a2", label: "X1.2", kind: "control", direction: "bidirectional", position: { x: -52, y: 11 } },
  { id: "port-1", label: "1 (P)", kind: "pneumatic", direction: "input", position: { x: 9, y: 38 } },
  { id: "port-2", label: "2 (A)", kind: "pneumatic", direction: "bidirectional", position: { x: 20, y: -36 } },
  { id: "port-3", label: "3 (R)", kind: "pneumatic", direction: "output", position: { x: 31, y: 38 } },
];

const fiveWayTerminals: TerminalDefinition[] = [
  ...terminals.slice(0, 2),
  { id: "port-1", label: "1", kind: "pneumatic", direction: "input", position: { x: 20, y: 38, vertical: true } },
  { id: "port-2", label: "2", kind: "pneumatic", direction: "bidirectional", position: { x: 32, y: -36, vertical: true } },
  { id: "port-3", label: "3", kind: "pneumatic", direction: "output", position: { x: 34, y: 38, vertical: true } },
  { id: "port-4", label: "4", kind: "pneumatic", direction: "bidirectional", position: { x: 8, y: -36, vertical: true } },
  { id: "port-5", label: "5", kind: "pneumatic", direction: "output", position: { x: 6, y: 38, vertical: true } },
];

export const festoValveCatalog: ElectricalComponentDefinition[] = variants.map(([orderCode, model, position, plugDirection]) => {
  const fiveWay = position === "five-way";
  const normallyOpen = position === true;
  const valveType = fiveWay ? "5/2" : "3/2";
  const mounting = model.startsWith("VOVG-L") ? "In-line" : model.startsWith("VOVG-S") ? "Semi in-line" : "Sub-base";
  return {
  id: "festo.vovg." + orderCode, name: "Festo " + orderCode + " · " + model,
  category: "Pneumatic Systems", referencePrefix: "V", symbolId: fiveWay ? "pneumatic-vovg-five-way" : normallyOpen ? "pneumatic-vovg-no" : "pneumatic-vovg-nc",
  description: mounting + " 24 V DC single-solenoid " + valveType + " valve with pneumatic spring return, internal pilot and " + plugDirection + " two-pin plug.",
  terminals: fiveWay ? fiveWayTerminals : terminals,
  manufacturerRecord: {
    manufacturer: "Festo", series: "VOVG", orderCode, sourceUrl: manual, terminalMap: "verified",
    documentRevision: "VOVG catalogue 2025/10, ordering tables and circuit symbols, pp. 16–17",
    topology: {
      type: valveType + "-monostable", coil: ["a1", "a2"], pilot: "internal",
      released: fiveWay ? [["port-1", "port-2"], ["port-4", "port-5"]] : [normallyOpen ? ["port-1", "port-2"] : ["port-2", "port-3"]],
      energized: fiveWay ? [["port-1", "port-4"], ["port-2", "port-3"]] : [normallyOpen ? ["port-2", "port-3"] : ["port-1", "port-2"]],
    },
  },
  propertiesSchema: { coilVoltageV: 24, coilDc: true, minOperatingPressureBar: 2, maxOperatingPressureBar: 8, workingPortConnection: mounting === "In-line" ? "M5" : "Sub-base interface", mounting, plugDirection },
  simulationModelId: fiveWay ? "festo-vovg-five-way" : normallyOpen ? "festo-vovg-no" : "festo-vovg-nc", simulationSupport: "control-logic",
  documentation: "The wired nominal-voltage coil determines the ideal spool position and displayed port pair. Pneumatic lines are editable connections. Air flow, pressure propagation, switching time and pilot pressure are outside the model.",
  standardsReferences: [manual, "https://ftp.festo.com/Public/PNEUMATIC/SOFTWARE_SERVICE/Datasheet/EN_GB/" + orderCode + ".pdf"],
  };
});
