import type { ProjectTemplate } from "./templateLibrary";

export function createWeighStationProject(): ProjectTemplate {
  const id = "weigh-station-acceptance-window";
  const name = "Weigh station acceptance window";
  const description = "A 1000 N load cell drives two millivolt comparators. The acceptance coil turns on only above 450 N and below 550 N. An out-of-range load disables acceptance. The diagram models the measurement and decision signals.";
  const samples = [
    { name: "Empty platform at 0 N. Acceptance stays off.", forceN: 0, output: "0.000 mV", accepted: false },
    { name: "At the lower boundary of 450 N, acceptance stays off.", forceN: 450, output: "4.500 mV", accepted: false },
    { name: "At 500 N, both comparators permit acceptance.", forceN: 500, output: "5.000 mV", accepted: true },
    { name: "At the upper boundary of 550 N, acceptance drops out.", forceN: 550, output: "5.500 mV", accepted: false },
    { name: "At full scale, the reading is valid and acceptance stays off.", forceN: 1000, output: "10.000 mV", accepted: false },
    { name: "At 1100 N, the measurement faults and acceptance is unavailable.", forceN: 1100, output: "ERROR: Load-cell force is outside the configured measuring range.", accepted: false, fault: true },
    { name: "Return to 500 N to restore acceptance.", forceN: 500, output: "5.000 mV", accepted: true },
  ];
  const operatingSequence = samples.map(({ name, forceN, output, accepted, fault }) => ({
    name,
    changes: [{ reference: "B1", properties: { forceN } }],
    expectations: [
      { reference: "B1", label: "Load-cell output", exact: output },
      { reference: "K1", label: fault ? "Signal fault" : "Coil", exact: fault ? output : accepted ? "ON" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "load-cell", definitionId: "sensor.load-cell", reference: "B1", x: 150, y: 360, rotation: 0, properties: { forceN: 0, capacityN: 1000 } },
        { id: "lower", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 390, y: 235, rotation: 0, properties: { left: 0, right: 4.5 } },
        { id: "upper", definitionId: "logic.comparator-less-than", reference: "CMP2", x: 390, y: 485, rotation: 0, properties: { left: 0, right: 5.5 } },
        { id: "window", definitionId: "logic.gate-and", reference: "G1", x: 640, y: 360, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "acceptance", definitionId: "logic.output-coil", reference: "K1", x: 875, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "bridge-reading", netName: "BRIDGE_MV", from: { componentId: "load-cell", terminalId: "signal" }, to: { componentId: "lower", terminalId: "in-a" }, points: [] },
        { id: "bridge-upper", netName: "BRIDGE_MV", from: { componentId: "load-cell", terminalId: "signal" }, to: { componentId: "upper", terminalId: "in-a" }, points: [] },
        { id: "above-minimum", netName: "ABOVE_MIN", from: { componentId: "lower", terminalId: "out" }, to: { componentId: "window", terminalId: "in-a" }, points: [] },
        { id: "below-maximum", netName: "BELOW_MAX", from: { componentId: "upper", terminalId: "out" }, to: { componentId: "window", terminalId: "in-b" }, points: [] },
        { id: "accept-command", netName: "ACCEPT", from: { componentId: "window", terminalId: "out" }, to: { componentId: "acceptance", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "Load-cell output", valueIncludes: "0.000 mV" },
      { reference: "G1", label: "AND output", valueIncludes: "OFF" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
