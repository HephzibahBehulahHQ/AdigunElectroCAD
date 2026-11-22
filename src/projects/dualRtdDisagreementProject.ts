import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createDualRtdDisagreementProject(): ProjectTemplate {
  const id = "dual-rtd-disagreement";
  const name = "Dual PT100 probe disagreement monitor";
  const description = "Two PT100 resistance signals feed a wired subtractor. The disagreement coil turns on when the signed difference is above +5 Ω or below −5 Ω. A shared temperature change leaves the difference at zero. The circuit models nominal probe resistance and indication.";
  const fault = "ERROR: PT100 temperature must be finite and within -200 to 850 °C.";
  const samples = [
    { name: "Start with matching probes at 20 °C.", a: 20, b: 20, alarm: "OFF" },
    { name: "Raise both probes to 120 °C. The common change does not trigger disagreement.", a: 120, b: 120, alarm: "OFF" },
    { name: "Separate the probes by 10 °C near ambient. Remain within the resistance band.", a: 30, b: 20, alarm: "OFF" },
    { name: "Raise probe A to 40 °C. Detect positive disagreement.", a: 40, b: 20, alarm: "ON" },
    { name: "Reverse the readings. Detect negative disagreement.", a: 20, b: 40, alarm: "ON" },
    { name: "Set probe B outside its modeled range. Verify an invalid comparison.", a: 20, b: 900, alarm: fault },
    { name: "Restore matching readings and verify the alarm clears.", a: 20, b: 20, alarm: "OFF" },
  ];
  const operatingSequence = samples.map(({ name, a, b, alarm }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "B1", properties: { temperatureC: a } }, { reference: "B2", properties: { temperatureC: b } }],
    expectations: [{ reference: "K1", label: alarm === fault ? "Signal fault" : "Coil", exact: alarm }],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "probe-a", definitionId: "sensor.pt100", reference: "B1", x: 130, y: 210, rotation: 0, properties: { temperatureC: 20 } },
        { id: "probe-b", definitionId: "sensor.pt100", reference: "B2", x: 130, y: 500, rotation: 0, properties: { temperatureC: 20 } },
        { id: "difference", definitionId: "logic.math-subtract", reference: "MTH1", x: 330, y: 360, rotation: 0, properties: { left: 0, right: 0 } },
        { id: "positive", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 525, y: 210, rotation: 0, properties: { left: 0, right: 5 } },
        { id: "negative", definitionId: "logic.comparator-less-than", reference: "CMP2", x: 525, y: 500, rotation: 0, properties: { left: 0, right: -5 } },
        { id: "vote", definitionId: "logic.gate-or", reference: "G1", x: 725, y: 360, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "K1", x: 930, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "probe-a-ohm", netName: "PROBE_A_OHM", from: { componentId: "probe-a", terminalId: "signal" }, to: { componentId: "difference", terminalId: "in-a" }, points: [] },
        { id: "probe-b-ohm", netName: "PROBE_B_OHM", from: { componentId: "probe-b", terminalId: "signal" }, to: { componentId: "difference", terminalId: "in-b" }, points: [] },
        { id: "difference-positive", netName: "PROBE_DIFFERENCE", from: { componentId: "difference", terminalId: "out" }, to: { componentId: "positive", terminalId: "in-a" }, points: [] },
        { id: "difference-negative", netName: "PROBE_DIFFERENCE", from: { componentId: "difference", terminalId: "out" }, to: { componentId: "negative", terminalId: "in-a" }, points: [] },
        { id: "positive-vote", netName: "POSITIVE_DEVIATION", from: { componentId: "positive", terminalId: "out" }, to: { componentId: "vote", terminalId: "in-a" }, points: [] },
        { id: "negative-vote", netName: "NEGATIVE_DEVIATION", from: { componentId: "negative", terminalId: "out" }, to: { componentId: "vote", terminalId: "in-b" }, points: [] },
        { id: "disagreement-alarm", netName: "PROBE_DISAGREEMENT", from: { componentId: "vote", terminalId: "out" }, to: { componentId: "alarm", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "PT100 resistance", valueIncludes: "107.79 Ω" },
      { reference: "MTH1", label: "Math output", valueIncludes: "0" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
