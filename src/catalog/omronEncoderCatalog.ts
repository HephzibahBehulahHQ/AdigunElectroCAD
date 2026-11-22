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

const standardResolutions = [10, 20, 30, 40, 50, 60, 100, 200, 300, 360, 400, 500, 600];
const differentialTerminals: TerminalDefinition[] = [
  ...terminals.filter(terminal => !terminal.id.startsWith("phase-")),
  ...terminals.filter(terminal => terminal.id.startsWith("phase-")).flatMap((terminal, index) => [
    { ...terminal, label: terminal.label + "+", position: { x: 47, y: -35 + index * 28 } },
    { ...terminal, id: terminal.id + "-inverted", label: terminal.label + "−", leadColor: terminal.leadColor + "/red", position: { x: 47, y: -21 + index * 28 } },
  ]),
];

const families = [
  {
    model: "CWZ6C", type: "npn-open-collector", resolutions: [...standardResolutions, 720, 800, 1000, 1024, 1200, 1500, 1800, 2000],
    ratings: { supplyMinV: 4.75, supplyMaxV: 27.6, maxResponseHz: 100000, maxSinkCurrentMa: 35 },
    outputCircuit: { sinkReference: "zero" },
  },
  {
    model: "CWZ5B", type: "pnp-open-collector", resolutions: [100, 200, 360, 500, 600, 1000, 2000],
    ratings: { supplyMinV: 10.8, supplyMaxV: 27.6, maxResponseHz: 50000, maxSourceCurrentMa: 35 },
    outputCircuit: { sourceReference: "vcc" },
  },
  {
    model: "CWZ3E", type: "npn-voltage-output", resolutions: [...standardResolutions, 1000, 1200, 1500, 1800, 2000],
    ratings: { supplyMinV: 4.75, supplyMaxV: 13.2, maxResponseHz: 100000, maxSinkCurrentMa: 20, outputResistanceOhm: 2000 },
    outputCircuit: { sinkReference: "zero", internalPullUpOhm: 2000 },
  },
  {
    model: "CWZ1X", type: "rs-422a-line-driver", resolutions: [...standardResolutions, 1000, 1024, 1200, 1500, 1800, 2000],
    ratings: { supplyMinV: 4.75, supplyMaxV: 5.25, maxResponseHz: 100000, maxOutputCurrentMa: 20 },
    outputCircuit: { pairedChannels: [["phase-a", "phase-a-inverted"], ["phase-b", "phase-b-inverted"], ["phase-z", "phase-z-inverted"]] },
  },
] as const;

const confirmedTwoMetreResolutions = [10, 20, 30, 100, 200, 300, 360, 1000, 1200, 1800, 2000];

function encoderPart(family: typeof families[number], pulsesPerRevolution: number, cableLengthM: number): ElectricalComponentDefinition {
  const { model, type, ratings, outputCircuit } = family;
  const differential = model === "CWZ1X";
  const leadSet = differential ? differentialTerminals : terminals;
  const orderCode = "E6B2-" + model + " " + pulsesPerRevolution + "P/R " + cableLengthM + "M";
  return {
    id: "omron.e6b2-" + model.toLowerCase() + "." + pulsesPerRevolution + "p-" + cableLengthM + "m",
    name: "Omron " + orderCode, category: "Advanced Sensors & Instrumentation", referencePrefix: "B",
    symbolId: differential ? "sensor-encoder-differential" : "sensor-encoder-abc", terminals: leadSet,
    description: "Incremental rotary encoder with A/B quadrature, Z index and " + cableLengthM + " m cable.",
    manufacturerRecord: {
      manufacturer: "Omron", series: "E6B2-C", orderCode, sourceUrl: diagram, terminalMap: "verified",
      documentRevision: "E6B2-C DS E 6_3, pp. 1–3; 2M variants confirmed in online Item Index",
      topology: { type, ...outputCircuit, shield: "separate drain" },
    },
    propertiesSchema: { pulsesPerRevolution, shaftSpeedRpm: 0, cableLengthM, maxShaftSpeedRpm: 6000, ...ratings },
    simulationModelId: "sensor-encoder-frequency", simulationSupport: "numerical",
    documentation: "Ideal shaft-speed-to-frequency model. A and B report P/R × revolutions per second. Z reports one event per revolution. Complementary leads have the same rate as their paired channel. Waveform phase, differential voltage, output loading and excitation continuity are outside the model.",
    standardsReferences: [diagram, index, "https://www.ia.omron.com/products/family/487/specification.html"],
  };
}

export const omronEncoderCatalog: ElectricalComponentDefinition[] = [
  ...confirmedTwoMetreResolutions.map(resolution => encoderPart(families[0], resolution, 2)),
  ...families.flatMap(family => family.resolutions.map(resolution => encoderPart(family, resolution, .5))),
];
