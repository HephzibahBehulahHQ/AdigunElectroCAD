import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createEncoderIndexInspectionProject(): ProjectTemplate {
  const id = "encoder-index-inspection";
  const name = "Indexed conveyor inspection trigger";
  const description = "A 1024-pulse/revolution encoder supplies a position count. The inspection command requires exactly 256 pulses and a wired inspection enable. A separate overshoot output indicates counts above 256. The example evaluates a static count snapshot without modeling conveyor motion or camera timing.";
  const encoderSignal = { componentId: "encoder", terminalId: "signal" };
  const indexInput = { componentId: "index", terminalId: "in-a" };
  const overshootInput = { componentId: "overshoot", terminalId: "in-a" };
  const samples = [
    { name: "Start at zero with inspection enabled.", revolutions: 0, pulses: 0, enabled: true, inspect: "OFF", overshoot: "OFF" },
    { name: "Approach the station at 255 pulses.", revolutions: 255 / 1024, pulses: 255, enabled: true, inspect: "OFF", overshoot: "OFF" },
    { name: "At the inspection index, the command turns on.", revolutions: .25, pulses: 256, enabled: true, inspect: "ON", overshoot: "OFF" },
    { name: "Disable inspection while still at the index.", revolutions: .25, pulses: 256, enabled: false, inspect: "OFF", overshoot: "OFF" },
    { name: "Past the station, signal overshoot and inhibit inspection.", revolutions: 257 / 1024, pulses: 257, enabled: true, inspect: "OFF", overshoot: "ON" },
    { name: "At the index, disconnect both encoder signal wires.", revolutions: .25, pulses: 256, enabled: true, inspect: "OFF", overshoot: "OFF", connected: false },
    { name: "Reconnect the encoder signal and verify inspection returns.", revolutions: .25, pulses: 256, enabled: true, inspect: "ON", overshoot: "OFF", connected: true },
  ];
  const operatingSequence = samples.map(({ name, revolutions, pulses, enabled, inspect, overshoot, connected }): CircuitSequenceStep => ({
    name,
    changes: [
      { reference: "B1", properties: { revolutions } },
      { reference: "S1", properties: { input: enabled } },
    ],
    wireChanges: connected === undefined ? undefined : [indexInput, overshootInput].map((to) => ({ from: encoderSignal, to, connected })),
    expectations: [
      { reference: "B1", label: "Encoder pulses", exact: String(pulses) },
      { reference: "Q1", label: "Coil", exact: inspect },
      { reference: "Q2", label: "Coil", exact: overshoot },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "encoder", definitionId: "sensor.encoder", reference: "B1", x: 150, y: 410, rotation: 0, properties: { revolutions: 0, pulsesPerRevolution: 1024 } },
        { id: "enable", definitionId: "logic.no-contact", reference: "S1", x: 390, y: 175, rotation: 0, properties: { input: true } },
        { id: "index", definitionId: "logic.comparator-equal-to", reference: "CMP1", x: 390, y: 350, rotation: 0, properties: { left: 0, right: 256 } },
        { id: "overshoot", definitionId: "logic.comparator-greater-than", reference: "CMP2", x: 390, y: 565, rotation: 0, properties: { left: 0, right: 256 } },
        { id: "inspection-gate", definitionId: "logic.gate-and", reference: "G1", x: 650, y: 350, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "inspection-command", definitionId: "logic.output-coil", reference: "Q1", x: 900, y: 350, rotation: 0, properties: { input: false } },
        { id: "overshoot-alarm", definitionId: "logic.output-coil", reference: "Q2", x: 900, y: 565, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "encoder-index", netName: "POSITION_COUNT", from: encoderSignal, to: indexInput, points: [] },
        { id: "encoder-overshoot", netName: "POSITION_COUNT", from: encoderSignal, to: overshootInput, points: [] },
        { id: "index-match", netName: "AT_INDEX", from: { componentId: "index", terminalId: "out" }, to: { componentId: "inspection-gate", terminalId: "in-a" }, points: [] },
        { id: "inspection-enable", netName: "INSPECTION_ENABLE", from: { componentId: "enable", terminalId: "out" }, to: { componentId: "inspection-gate", terminalId: "in-b" }, points: [] },
        { id: "inspection-output", netName: "TRIGGER", from: { componentId: "inspection-gate", terminalId: "out" }, to: { componentId: "inspection-command", terminalId: "in" }, points: [] },
        { id: "overshoot-output", netName: "OVERSHOOT", from: { componentId: "overshoot", terminalId: "out" }, to: { componentId: "overshoot-alarm", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "Encoder pulses", valueIncludes: "0" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
      { reference: "Q2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
