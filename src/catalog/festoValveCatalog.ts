import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const manual = "https://ftp.festo.com/public/pneumatic/SOFTWARE_SERVICE/Documentation/2021/EN/VOVG_EN.PDF";
const variants = [
  ["560697", "VOVG-L10-M32C-AH-M5-1H2", false, "horizontal"],
  ["560698", "VOVG-L10-M32C-AH-M5-1H3", false, "vertical"],
  ["560699", "VOVG-L10-M32U-AH-M5-1H2", true, "horizontal"],
  ["560700", "VOVG-L10-M32U-AH-M5-1H3", true, "vertical"],
] as const;

const terminals: TerminalDefinition[] = [
  { id: "a1", label: "X1.1", kind: "control", direction: "bidirectional", position: { x: -52, y: -11 } },
  { id: "a2", label: "X1.2", kind: "control", direction: "bidirectional", position: { x: -52, y: 11 } },
  { id: "port-1", label: "1 (P)", kind: "pneumatic", direction: "input", position: { x: 9, y: 38 } },
  { id: "port-2", label: "2 (A)", kind: "pneumatic", direction: "bidirectional", position: { x: 20, y: -36 } },
  { id: "port-3", label: "3 (R)", kind: "pneumatic", direction: "output", position: { x: 31, y: 38 } },
];

export const festoValveCatalog: ElectricalComponentDefinition[] = variants.map(([orderCode, model, normallyOpen, plugDirection]) => ({
  id: "festo.vovg." + orderCode, name: "Festo " + orderCode + " · " + model,
  category: "Pneumatic Systems", referencePrefix: "V", symbolId: normallyOpen ? "pneumatic-vovg-no" : "pneumatic-vovg-nc",
  description: "24 V DC single-solenoid 3/2 valve with pneumatic spring return, internal pilot and " + plugDirection + " two-pin plug.",
  terminals,
  manufacturerRecord: {
    manufacturer: "Festo", series: "VOVG", orderCode, sourceUrl: manual, terminalMap: "verified",
    documentRevision: "VOVG catalogue 2021/01, in-line ordering table and circuit symbols, p. 13",
    topology: {
      type: "3/2-monostable", coil: ["a1", "a2"], pilot: "internal",
      released: [normallyOpen ? ["port-1", "port-2"] : ["port-2", "port-3"]],
      energized: [normallyOpen ? ["port-2", "port-3"] : ["port-1", "port-2"]],
    },
  },
  propertiesSchema: { coilVoltageV: 24, coilDc: true, minOperatingPressureBar: 2, maxOperatingPressureBar: 8, workingPortThread: "M5", plugDirection },
  simulationModelId: normallyOpen ? "festo-vovg-no" : "festo-vovg-nc", simulationSupport: "control-logic",
  documentation: "The wired nominal-voltage coil determines the ideal spool position and displayed port pair. Pneumatic lines are editable connections. Air flow, pressure propagation, switching time and pilot pressure are outside the model.",
  standardsReferences: [manual, "https://ftp.festo.com/Public/PNEUMATIC/SOFTWARE_SERVICE/Datasheet/EN_GB/" + orderCode + ".pdf"],
}));
