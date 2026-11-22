import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createTransferProofWatchdogProject(): ProjectTemplate {
  const id = "plc-transfer-proof-watchdog";
  const name = "PLC transfer proof watchdog";
  const description = "A wired request starts the transfer command. The destination proximity sensor must prove arrival within two simulated seconds. Proof stops the transfer. A timeout drops the command and raises a separate alarm until the request is cleared or proof arrives. This example models PLC signals and timing.";
  const proofSignal = { componentId: "proof", terminalId: "signal" };
  const proofInput = { componentId: "plc", terminalId: "in-1" };
  const cases = [
    { name: "Idle with no request or proof.", request: false, proof: false, seconds: .1, transfer: false, alarm: false },
    { name: "Request a transfer and verify the command while awaiting proof.", request: true, proof: false, seconds: 1, transfer: true, alarm: false },
    { name: "Prove arrival before the timeout and stop the command.", request: true, proof: true, seconds: .1, transfer: false, alarm: false },
    { name: "Clear the request and sensor for the next cycle.", request: false, proof: false, seconds: .1, transfer: false, alarm: false },
    { name: "Start the next transfer with the proof signal wire open.", request: true, proof: false, connected: false, seconds: 1, transfer: true, alarm: false },
    { name: "Detect arrival with the wire open. At two seconds the PLC stops the command and alarms.", request: true, proof: true, seconds: 1, transfer: false, alarm: true },
    { name: "Clear the request to reset the timeout.", request: false, proof: true, seconds: .1, transfer: false, alarm: false },
    { name: "Reconnect the proof wire and request another transfer.", request: true, proof: false, connected: true, seconds: .5, transfer: true, alarm: false },
    { name: "Prove arrival again and verify recovery.", request: true, proof: true, seconds: .1, transfer: false, alarm: false },
  ];
  const state = (value: boolean) => value ? "ON" : "OFF";
  const operatingSequence = cases.map(({ name, request, proof, seconds, transfer, alarm, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: request } }, { reference: "B1", properties: { detected: proof } }],
    wireChanges: connected === undefined ? undefined : [{ from: proofSignal, to: proofInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: state(transfer) },
      { reference: "K2", label: "Coil", exact: state(alarm) },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "request", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 220, rotation: 0, properties: { input: false } },
        { id: "proof", definitionId: "generic.iec.proximity-sensor", reference: "B1", x: 165, y: 500, rotation: 0, properties: { detected: false } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LD I0; ANDN I1; TON T0 2; LD T0; OUT Q1; LD I0; ANDN I1; ANDN T0; OUT Q0",
        } },
        { id: "transfer-command", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "timeout-alarm", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "request-i0", netName: "TRANSFER_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "proof-i1", netName: "ARRIVAL_PROOF", from: proofSignal, to: proofInput, points: [] },
        { id: "proof-common", netName: "SENSOR_COM", from: { componentId: "proof", terminalId: "common" }, to: { componentId: "plc", terminalId: "common" }, points: [] },
        { id: "transfer-q0", netName: "TRANSFER_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "transfer-command", terminalId: "in" }, points: [] },
        { id: "alarm-q1", netName: "ARRIVAL_TIMEOUT", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "timeout-alarm", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 OFF · Q1 OFF" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
