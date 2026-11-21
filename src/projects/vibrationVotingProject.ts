import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createVibrationVotingProject(): ProjectTemplate {
  const id = "dual-vibration-voting";
  const name = "Dual vibration monitor · alarm and disagreement";
  const description = "Two vibration channels compare their modeled RMS acceleration with a 4 m/s² threshold. Q1 indicates both channels above the threshold. Q2 indicates that only one channel is above it. The thresholds are editable example values for an idealized signal circuit.";
  const cases = [
    { name: "Both channels normal", a: 2, b: 2, alarm: "OFF", disagreement: "OFF" },
    { name: "Channel A high only", a: 5, b: 4, alarm: "OFF", disagreement: "ON" },
    { name: "Channel B high only", a: 4, b: 5, alarm: "OFF", disagreement: "ON" },
    { name: "Both channels high", a: 5, b: 6, alarm: "ON", disagreement: "OFF" },
    { name: "Return to normal", a: 3, b: 3, alarm: "OFF", disagreement: "OFF" },
  ];
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "sensor-a", definitionId: "sensor.vibration", reference: "B1", x: 150, y: 200, rotation: 0, properties: { acceleration: 2 } },
        { id: "sensor-b", definitionId: "sensor.vibration", reference: "B2", x: 150, y: 500, rotation: 0, properties: { acceleration: 2 } },
        { id: "limit-a", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 390, y: 200, rotation: 0, properties: { left: 0, right: 4 } },
        { id: "limit-b", definitionId: "logic.comparator-greater-than", reference: "CMP2", x: 390, y: 500, rotation: 0, properties: { left: 0, right: 4 } },
        { id: "alarm-vote", definitionId: "logic.gate-and", reference: "LG1", x: 650, y: 200, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "disagree-vote", definitionId: "logic.gate-xor", reference: "LG2", x: 650, y: 500, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "Q1", x: 900, y: 200, rotation: 0, properties: { input: false } },
        { id: "disagreement", definitionId: "logic.output-coil", reference: "Q2", x: 900, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "vibration-a", from: { componentId: "sensor-a", terminalId: "signal" }, to: { componentId: "limit-a", terminalId: "in-a" }, netName: "VIB_A", points: [] },
        { id: "vibration-b", from: { componentId: "sensor-b", terminalId: "signal" }, to: { componentId: "limit-b", terminalId: "in-a" }, netName: "VIB_B", points: [] },
        { id: "high-a-alarm", from: { componentId: "limit-a", terminalId: "out" }, to: { componentId: "alarm-vote", terminalId: "in-a" }, netName: "HIGH_A", points: [] },
        { id: "high-a-disagreement", from: { componentId: "limit-a", terminalId: "out" }, to: { componentId: "disagree-vote", terminalId: "in-a" }, netName: "HIGH_A", points: [{ x: 485, y: 210 }, { x: 485, y: 490 }] },
        { id: "high-b-alarm", from: { componentId: "limit-b", terminalId: "out" }, to: { componentId: "alarm-vote", terminalId: "in-b" }, netName: "HIGH_B", points: [{ x: 560, y: 510 }, { x: 560, y: 222 }] },
        { id: "high-b-disagreement", from: { componentId: "limit-b", terminalId: "out" }, to: { componentId: "disagree-vote", terminalId: "in-b" }, netName: "HIGH_B", points: [] },
        { id: "alarm-command", from: { componentId: "alarm-vote", terminalId: "out" }, to: { componentId: "alarm", terminalId: "in" }, netName: "VIB_ALARM", points: [] },
        { id: "disagreement-command", from: { componentId: "disagree-vote", terminalId: "out" }, to: { componentId: "disagreement", terminalId: "in" }, netName: "VIB_DISAGREE", points: [] },
      ],
    },
    testSequence: cases.map(({ name, a, b, alarm, disagreement }) =>
      `${name}. Set B1 to ${a} m/s² and B2 to ${b} m/s². Expect Q1 ${alarm} and Q2 ${disagreement}.`,
    ),
    expectedOutputs: [
      { reference: "B1", label: "Vibration RMS", valueIncludes: "2.000 m/s²" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
      { reference: "Q2", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: cases.map(({ name, a, b, alarm, disagreement }): CircuitSequenceStep => ({
      name,
      changes: [
        { reference: "B1", properties: { acceleration: a } },
        { reference: "B2", properties: { acceleration: b } },
      ],
      expectations: [
        { reference: "Q1", label: "Coil", exact: alarm },
        { reference: "Q2", label: "Coil", exact: disagreement },
      ],
    })),
  };
}
