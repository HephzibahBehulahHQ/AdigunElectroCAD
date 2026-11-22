import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createNetWeightCheckweigherProject(): ProjectTemplate {
  const id = "net-weight-checkweigher";
  const name = "Container net-weight checkweigher";
  const description = "Matched 1000 N load cells provide gross and tare signals. A wired subtractor removes tare and two comparators permit a container only when its net load is strictly between 400 N and 600 N. Overload of either sensor invalidates acceptance. The circuit models indicated forces and decision signals.";
  const overload = "ERROR: Load-cell force is outside the configured measuring range.";
  const samples = [
    { name: "Empty container. Gross and tare match, so reject.", gross: 100, tare: 100, net: 0, accepted: false },
    { name: "Load 700 N gross and 200 N tare. Accept the 500 N net load.", gross: 700, tare: 200, net: 500, accepted: true },
    { name: "Change to a heavier empty container at the same gross load. Reject the 400 N boundary.", gross: 700, tare: 300, net: 400, accepted: false },
    { name: "At 600 N net, reject the upper boundary.", gross: 800, tare: 200, net: 600, accepted: false },
    { name: "Overload the gross sensor. Verify that acceptance faults.", gross: 1100, tare: 200, net: null, accepted: false },
    { name: "Restore gross load and overload the tare sensor instead.", gross: 700, tare: 1100, net: null, accepted: false },
    { name: "Restore both readings and verify acceptance returns.", gross: 700, tare: 200, net: 500, accepted: true },
  ];
  const operatingSequence = samples.map(({ name, gross, tare, net, accepted }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "B1", properties: { forceN: gross } }, { reference: "B2", properties: { forceN: tare } }],
    expectations: net === null ? [{ reference: "K1", label: "Signal fault", exact: overload }] : [
      { reference: "MTH1", label: "Math output", numeric: net / 100, tolerance: 1e-9 },
      { reference: "K1", label: "Coil", exact: accepted ? "ON" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "gross", definitionId: "sensor.load-cell", reference: "B1", x: 130, y: 210, rotation: 0, properties: { forceN: 100, capacityN: 1000 } },
        { id: "tare", definitionId: "sensor.load-cell", reference: "B2", x: 130, y: 500, rotation: 0, properties: { forceN: 100, capacityN: 1000 } },
        { id: "net", definitionId: "logic.math-subtract", reference: "MTH1", x: 330, y: 360, rotation: 0, properties: { left: 0, right: 0 } },
        { id: "minimum", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 525, y: 210, rotation: 0, properties: { left: 0, right: 4 } },
        { id: "maximum", definitionId: "logic.comparator-less-than", reference: "CMP2", x: 525, y: 500, rotation: 0, properties: { left: 0, right: 6 } },
        { id: "window", definitionId: "logic.gate-and", reference: "G1", x: 725, y: 360, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "accept", definitionId: "logic.output-coil", reference: "K1", x: 930, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "gross-mv", netName: "GROSS_MV", from: { componentId: "gross", terminalId: "signal" }, to: { componentId: "net", terminalId: "in-a" }, points: [] },
        { id: "tare-mv", netName: "TARE_MV", from: { componentId: "tare", terminalId: "signal" }, to: { componentId: "net", terminalId: "in-b" }, points: [] },
        { id: "net-minimum", netName: "NET_MV", from: { componentId: "net", terminalId: "out" }, to: { componentId: "minimum", terminalId: "in-a" }, points: [] },
        { id: "net-maximum", netName: "NET_MV", from: { componentId: "net", terminalId: "out" }, to: { componentId: "maximum", terminalId: "in-a" }, points: [] },
        { id: "above-minimum", netName: "ABOVE_MINIMUM", from: { componentId: "minimum", terminalId: "out" }, to: { componentId: "window", terminalId: "in-a" }, points: [] },
        { id: "below-maximum", netName: "BELOW_MAXIMUM", from: { componentId: "maximum", terminalId: "out" }, to: { componentId: "window", terminalId: "in-b" }, points: [] },
        { id: "accept-coil", netName: "NET_LOAD_ACCEPT", from: { componentId: "window", terminalId: "out" }, to: { componentId: "accept", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "Load-cell output", valueIncludes: "1.000 mV" },
      { reference: "B2", label: "Load-cell output", valueIncludes: "1.000 mV" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
