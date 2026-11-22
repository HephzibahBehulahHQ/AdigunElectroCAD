import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createPoweredTimerPilotTransferProject(): ProjectTemplate {
  const id = "dc-powered-timer-pilot-transfer";
  const name = "Powered DC timer pilot transfer";
  const description = "A 24 V DC coil energizes an on-delay changeover timer. Its common terminal feeds the standby pilot through 15–16 until two simulated seconds have elapsed, then feeds the timed pilot through 15–18. Opening the coil return drops the timer and resets the delay.";
  const coilReturn = { from: { componentId: "timer", terminalId: "a2" }, to: { componentId: "dc", terminalId: "zero-out" } };
  const samples = [
    { name: "With the timer idle, the standby pilot lights.", pressed: false, seconds: .1, transferred: false, timing: "0.0 / 2.0 s" },
    { name: "Energize the coil for one second. The standby pilot stays lit.", pressed: true, seconds: 1, transferred: false, timing: "1.0 / 2.0 s" },
    { name: "Release before the preset. Reset the elapsed time.", pressed: false, seconds: .1, transferred: false, timing: "0.0 / 2.0 s" },
    { name: "Energize for a fresh two seconds. The timed pilot takes over.", pressed: true, seconds: 2, transferred: true, timing: "CLOSED" },
    { name: "Open the coil return with START held. Restore the standby pilot and reset the timer.", pressed: true, seconds: .1, transferred: false, timing: "0.0 / 2.0 s", connected: false },
    { name: "Reconnect the coil return. After one second the timer is still waiting.", pressed: true, seconds: 1, transferred: false, timing: "1.0 / 2.0 s", connected: true },
    { name: "Complete the new delay and verify transfer again.", pressed: true, seconds: 1, transferred: true, timing: "CLOSED" },
  ];
  const operatingSequence = samples.map(({ name, pressed, seconds, transferred, timing, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { pressed } }],
    wireChanges: connected === undefined ? undefined : [{ ...coilReturn, connected }],
    expectations: [
      { reference: "KT1", label: "Timer contact", exact: timing },
      { reference: "H1", label: "Indicator lamp", exact: transferred ? "LIT · 24 V DC" : "OFF" },
      { reference: "H2", label: "Indicator lamp", exact: transferred ? "OFF" : "LIT · 24 V DC" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 360, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 300, y: 360, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "command", definitionId: "pushbutton.start-no", reference: "S1", x: 490, y: 190, rotation: 0, properties: { pressed: false } },
        { id: "timer", definitionId: "iec.on-delay-timer.01", reference: "KT1", x: 640, y: 360, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, energized: false, elapsedSeconds: 0, delaySeconds: 2 } },
        { id: "timed", definitionId: "user.indicator-lamp", reference: "H1", x: 925, y: 210, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Timed" } },
        { id: "standby", definitionId: "user.indicator-lamp", reference: "H2", x: 925, y: 510, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#a16207", indication: "Standby" } },
      ],
      wires: [
        { id: "line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "command-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "command", terminalId: "13" }, points: [] },
        { id: "coil-feed", netName: "COIL_PLUS", from: { componentId: "command", terminalId: "14" }, to: { componentId: "timer", terminalId: "a1" }, points: [] },
        { id: "coil-return", netName: "DC_RETURN", ...coilReturn, points: [] },
        { id: "changeover-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "timer", terminalId: "15" }, points: [] },
        { id: "timed-feed", netName: "TIMED", from: { componentId: "timer", terminalId: "18" }, to: { componentId: "timed", terminalId: "t1" }, points: [] },
        { id: "standby-feed", netName: "STANDBY", from: { componentId: "timer", terminalId: "16" }, to: { componentId: "standby", terminalId: "t1" }, points: [] },
        { id: "timed-return", netName: "DC_RETURN", from: { componentId: "timed", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
        { id: "standby-return", netName: "DC_RETURN", from: { componentId: "standby", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
      { reference: "H2", label: "Indicator lamp", valueIncludes: "LIT · 24 V DC" },
    ],
  };
}
