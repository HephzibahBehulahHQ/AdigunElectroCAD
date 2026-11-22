import type { ElectricalComponentDefinition, TerminalDefinition } from "../types/electrical";

const diagram = "https://www.ia.omron.com/data_pdf/cat/e6b2-c_ds_e_6_3_csm491.pdf";
const index = "https://www.ia.omron.com/product/family/487/index_pro_51.html";
const terminals: TerminalDefinition[] = [
  { id: "vcc", label: "+V", kind: "control", direction: "input", leadColor: "brown", position: { x: -47, y: -22 } },
  { id: "zero", label: "0V", kind: "control", direction: "input", leadColor: "blue", position: { x: -47, y: 0 } },
  { id: "shield", label: "SH", kind: "shield", direction: "bidirectional", position: { x: -47, y: 22 } },
  { id: "phase-a", label: "A", kind: "control", direction: "output", leadColor: "black", position: { x: 47, y: -22 } },
  { id: "phase-b", label: "B", kind: "control", direction: "output", leadColor: "white", position: { x: 47, y: 0 } },
  { id: "phase-z", label: "Z", kind: "control", direction: "output", leadColor: "orange", position: { x: 47, y: 22 } },
];

export const omronEncoderCatalog: ElectricalComponentDefinition[] = [10, 20, 30, 100, 200, 300, 360, 1000, 1200, 1800, 2000].map(pulsesPerRevolution => {
  const orderCode = "E6B2-CWZ6C " + pulsesPerRevolution + "P/R 2M";
  return {
    id: "omron.e6b2-cwz6c." + pulsesPerRevolution + "p-2m", name: "Omron " + orderCode,
    category: "Advanced Sensors & Instrumentation", referencePrefix: "B",
    symbolId: "sensor-encoder-abc", terminals,
    description: "Incremental rotary encoder with A/B quadrature, Z index and 2 m cable.",
    manufacturerRecord: {
      manufacturer: "Omron", series: "E6B2-C", orderCode, sourceUrl: diagram, terminalMap: "verified",
      documentRevision: "E6B2-C DS E 6_3, I/O Circuit Diagrams and online Item Index",
      topology: { type: "npn-open-collector", sinkReference: "zero", independentChannels: ["phase-a", "phase-b", "phase-z"], shield: "separate drain" },
    },
    propertiesSchema: { pulsesPerRevolution, shaftSpeedRpm: 0, cableLengthM: 2, supplyMinV: 4.75, supplyMaxV: 27.6, maxShaftSpeedRpm: 6000, maxResponseHz: 100000, maxSinkCurrentMa: 35 },
    simulationModelId: "sensor-encoder-frequency", simulationSupport: "numerical",
    documentation: "Ideal shaft-speed-to-frequency model. A and B each report P/R × revolutions per second. Z reports one event per revolution. Waveform phase, direction decoding, pull-up current, and excitation continuity are outside the model.",
    standardsReferences: [diagram, index, "https://www.ia.omron.com/products/family/487/specification.html"],
  };
});
