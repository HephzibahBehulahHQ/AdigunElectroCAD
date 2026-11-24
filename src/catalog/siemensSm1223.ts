import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

export const sm1223SymbolId = "plc-io-siemens-sm1223";
export const sm1223DefinitionId = "siemens.sm1223.6es7223-1bh32-0xb0";

function terminal(connector: string, pin: number, label: string, x: number, y: number,
  direction: TerminalDefinition["direction"], kind: TerminalDefinition["kind"] = "control"): TerminalDefinition {
  return { id: connector.toLowerCase() + "-" + pin, label, kind, direction, position: { x, y, vertical: true } };
}

const inputs = (connector: string, firstChannel: number, startX: number) => Array.from({ length: 4 }, (_, index) =>
  terminal(connector, index + 4, "I" + (firstChannel + index), startX + index * 22, -55, "input"));
const outputs = (connector: string, firstChannel: number, startX: number) => Array.from({ length: 4 }, (_, index) =>
  terminal(connector, index + 4, "Q" + (firstChannel + index), startX + index * 22, 55, "output"));

export const sm1223Connectors = [
  { name: "X10", title: "24 V DC · DI 0–3", terminals: [
    terminal("X10", 1, "L+", -142, -55, "input"),
    terminal("X10", 2, "M", -120, -55, "input"),
    terminal("X10", 3, "1M", -98, -55, "input"),
    ...inputs("X10", 0, -76),
  ] },
  { name: "X11", title: "Functional earth · DI 4–7", terminals: [
    terminal("X11", 1, "FE", 20, -55, "bidirectional", "shield"),
    terminal("X11", 3, "2M", 42, -55, "input"),
    ...inputs("X11", 4, 64),
  ] },
  { name: "X12", title: "DQ 0–3", terminals: outputs("X12", 0, -120) },
  { name: "X13", title: "DQ 4–7", terminals: outputs("X13", 4, 54) },
];

const source = "https://cache.industry.siemens.com/dl/files/129/109764129/att_974298/v1/s71200_system_manual_en-US_en-US.pdf";

export const sm1223Definition: ElectricalComponentDefinition = {
  id: sm1223DefinitionId, name: "Siemens SM 1223 · 8 DI / 8 DQ", category: "PLC & I/O",
  referencePrefix: "IO", symbolId: sm1223SymbolId,
  description: "S7-1200 digital signal module with eight 24 V DC inputs and eight transistor outputs.",
  propertiesSchema: { nominalVoltageV: 24 },
  terminals: sm1223Connectors.flatMap(connector => connector.terminals),
  simulationModelId: "siemens-sm1223-terminal-map", simulationSupport: "connectivity",
  documentation: "I and Q labels are relative to the module start addresses. Unused connector cavities are omitted. The drawing models independent terminal endpoints. CPU programming and transistor switching are outside this component model.",
  manufacturerRecord: { manufacturer: "Siemens", series: "S7-1200 SM 1223", orderCode: "6ES7223-1BH32-0XB0",
    sourceUrl: source, terminalMap: "verified", documentRevision: "S7-1200 V4.3 system manual, tables A-129 and A-130" },
  standardsReferences: [source],
};
