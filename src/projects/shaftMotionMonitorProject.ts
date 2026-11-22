import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createShaftMotionMonitorProject(): ProjectTemplate {
  const id = "plc-shaft-motion-monitor";
  const name = "Shaft motion loss monitor";
  const description = "A wired proximity sensor represents shaft movement with sampled transitions. While monitoring is enabled, either transition resets a one-second timer. A missing transition latches the motion-loss alarm and drops the run permit until monitoring is disabled. This signal-level example models a PLC scan and startup grace period.";
  const pulseSignal = { componentId: "pulse", terminalId: "signal" };
  const pulseInput = { componentId: "plc", terminalId: "in-0" };
  const cases = [
    { name: "Start with monitoring disabled.", enabled: false, detected: false, seconds: .1, permit: "OFF", alarm: "OFF" },
    { name: "Enable monitoring and verify the startup grace interval.", enabled: true, detected: false, seconds: .5, permit: "ON", alarm: "OFF" },
    { name: "Sample a rising transition and reset the timer.", enabled: true, detected: true, seconds: .1, permit: "ON", alarm: "OFF" },
    { name: "Keep the sensor high for six tenths of a second.", enabled: true, detected: true, seconds: .6, permit: "ON", alarm: "OFF" },
    { name: "Sample a falling transition and reset the timer again.", enabled: true, detected: false, seconds: .1, permit: "ON", alarm: "OFF" },
    { name: "Disconnect the sensor signal just after the falling transition.", enabled: true, detected: false, connected: false, seconds: .3, permit: "ON", alarm: "OFF" },
    { name: "Let the transition timeout expire. Drop the permit and latch the alarm.", enabled: true, detected: true, seconds: .8, permit: "OFF", alarm: "ON" },
    { name: "Reconnect the sensor. A new transition must leave the alarm latched.", enabled: true, detected: true, connected: true, seconds: .1, permit: "OFF", alarm: "ON" },
    { name: "Disable monitoring to clear the alarm.", enabled: false, detected: false, seconds: .1, permit: "OFF", alarm: "OFF" },
    { name: "Re-enable monitoring and verify a fresh grace interval.", enabled: true, detected: false, seconds: .5, permit: "ON", alarm: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, enabled, detected, seconds, permit, alarm, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "B1", properties: { detected } }, { reference: "S1", properties: { input: enabled } }],
    wireChanges: connected === undefined ? undefined : [{ from: pulseSignal, to: pulseInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: permit },
      { reference: "K2", label: "Coil", exact: alarm },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "pulse", definitionId: "generic.iec.proximity-sensor", reference: "B1", x: 165, y: 220, rotation: 0, properties: { detected: false } },
        { id: "enable", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 500, rotation: 0, properties: { input: false } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LDP I0; ORF I0; OUT M1; LD I1; ANDN M1; TON T0 1; LD T0; SET M0; LDN I1; RESET M0; LD I1; ANDN M0; OUT Q0; LD M0; OUT Q1",
        } },
        { id: "permit", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "pulse-i0", netName: "SHAFT_SENSOR", from: pulseSignal, to: pulseInput, points: [] },
        { id: "pulse-common", netName: "SENSOR_COM", from: { componentId: "pulse", terminalId: "common" }, to: { componentId: "plc", terminalId: "common" }, points: [] },
        { id: "enable-i1", netName: "MONITOR_ENABLE", from: { componentId: "enable", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-1" }, points: [] },
        { id: "permit-q0", netName: "RUN_PERMIT", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "permit", terminalId: "in" }, points: [] },
        { id: "alarm-q1", netName: "MOTION_LOSS", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "alarm", terminalId: "in" }, points: [] },
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
