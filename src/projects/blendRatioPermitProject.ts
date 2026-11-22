import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createBlendRatioPermitProject(): ProjectTemplate {
  const id = "blend-ratio-permit";
  const name = "Blend station dosing ratio permit";
  const description = "Two pulse flowmeters measure additive and carrier streams. The carrier meter produces two hertz per litre per minute, so a wired scale block doubles the frequency ratio to obtain the flow ratio. The blend permit requires an additive-to-carrier ratio strictly between 0.1875 and 0.3125. Zero carrier flow produces a ratio fault. The example models measured flow and permit logic.";
  const fault = "ERROR: Division by zero is invalid.";
  const samples = [
    { name: "At 8 L/min additive and 32 L/min carrier, permit the blend.", additive: 8, carrier: 32, ratio: "0.25", permit: "ON" },
    { name: "At the lean boundary, drop the permit.", additive: 6, carrier: 32, ratio: "0.1875", permit: "OFF" },
    { name: "At the rich boundary, drop the permit.", additive: 10, carrier: 32, ratio: "0.3125", permit: "OFF" },
    { name: "At reduced throughput, 4 L/min additive and 16 L/min carrier still pass.", additive: 4, carrier: 16, ratio: "0.25", permit: "ON" },
    { name: "Stop carrier flow and verify a propagated ratio fault.", additive: 4, carrier: 0, ratio: fault, permit: fault },
    { name: "Restore carrier flow and verify the permit returns.", additive: 4, carrier: 16, ratio: "0.25", permit: "ON" },
  ];
  const operatingSequence = samples.map(({ name, additive, carrier, ratio, permit }): CircuitSequenceStep => ({
    name,
    changes: [
      { reference: "B1", properties: { flowLpm: additive } },
      { reference: "B2", properties: { flowLpm: carrier } },
    ],
    expectations: [
      { reference: "B2", label: "Pulse output", exact: (carrier * 2).toFixed(2) + " Hz" },
      { reference: "MTH1", label: ratio === fault ? "Signal fault" : "Math output", exact: ratio },
      { reference: "K1", label: permit === fault ? "Signal fault" : "Coil", exact: permit },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "additive", definitionId: "sensor.flow-pulse", reference: "B1", x: 115, y: 220, rotation: 0, properties: { flowLpm: 8, pulsesPerLitre: 60 } },
        { id: "carrier", definitionId: "sensor.flow-pulse", reference: "B2", x: 115, y: 510, rotation: 0, properties: { flowLpm: 32, pulsesPerLitre: 120 } },
        { id: "ratio-scale", definitionId: "logic.math-multiply", reference: "MTH1", x: 470, y: 360, rotation: 0, properties: { left: 0, right: 2 } },
        { id: "ratio", definitionId: "logic.math-divide", reference: "MTH2", x: 285, y: 360, rotation: 0, properties: { left: 0, right: 0 } },
        { id: "lean-limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 600, y: 220, rotation: 0, properties: { left: 0, right: .1875 } },
        { id: "rich-limit", definitionId: "logic.comparator-less-than", reference: "CMP2", x: 600, y: 510, rotation: 0, properties: { left: 0, right: .3125 } },
        { id: "permit", definitionId: "logic.gate-and", reference: "G1", x: 770, y: 360, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "blend-command", definitionId: "logic.output-coil", reference: "K1", x: 950, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "additive-frequency", netName: "ADDITIVE_HZ", from: { componentId: "additive", terminalId: "signal" }, to: { componentId: "ratio", terminalId: "in-a" }, points: [] },
        { id: "carrier-frequency", netName: "CARRIER_HZ", from: { componentId: "carrier", terminalId: "signal" }, to: { componentId: "ratio", terminalId: "in-b" }, points: [] },
        { id: "frequency-ratio", netName: "FREQUENCY_RATIO", from: { componentId: "ratio", terminalId: "out" }, to: { componentId: "ratio-scale", terminalId: "in-a" }, points: [] },
        { id: "ratio-lean", netName: "BLEND_RATIO", from: { componentId: "ratio-scale", terminalId: "out" }, to: { componentId: "lean-limit", terminalId: "in-a" }, points: [] },
        { id: "ratio-rich", netName: "BLEND_RATIO", from: { componentId: "ratio-scale", terminalId: "out" }, to: { componentId: "rich-limit", terminalId: "in-a" }, points: [] },
        { id: "above-lean-limit", netName: "ABOVE_MINIMUM", from: { componentId: "lean-limit", terminalId: "out" }, to: { componentId: "permit", terminalId: "in-a" }, points: [] },
        { id: "below-rich-limit", netName: "BELOW_MAXIMUM", from: { componentId: "rich-limit", terminalId: "out" }, to: { componentId: "permit", terminalId: "in-b" }, points: [] },
        { id: "blend-permit", netName: "BLEND_PERMIT", from: { componentId: "permit", terminalId: "out" }, to: { componentId: "blend-command", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B2", label: "Pulse output", valueIncludes: "64.00 Hz" },
      { reference: "MTH1", label: "Math output", valueIncludes: "0.25" },
      { reference: "K1", label: "Coil", valueIncludes: "ON" },
    ],
  };
}
