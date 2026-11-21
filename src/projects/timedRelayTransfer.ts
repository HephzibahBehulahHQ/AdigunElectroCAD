import type { ProjectTemplate } from "./templateLibrary";

export function createTimedRelayTransferProject(): ProjectTemplate {
  const document: ProjectTemplate["document"] = {
    id: "timed-relay-transfer",
    name: "Timed interface relay transfer",
    description: "A sustained S1 command runs a two-second on-delay timer. KT1 then energizes K1, transferring its wired signal from Y1 to Y2. Opening S1 returns the signal to Y1. This is a Boolean control example with editable generic devices and unset electrical ratings.",
    revision: 1,
    components: [
      { id: "start", definitionId: "logic.no-contact", reference: "S1", x: 140, y: 150, rotation: 0, properties: { input: false } },
      { id: "signal", definitionId: "logic.no-contact", reference: "S2", x: 140, y: 360, rotation: 0, properties: { input: true } },
      { id: "timer", definitionId: "generic.iec.on-delay-timer", reference: "KT1", x: 360, y: 150, rotation: 0, properties: { energized: false, elapsedSeconds: 0, delaySeconds: 2 } },
      { id: "relay", definitionId: "generic.iec.interface-relay", reference: "K1", x: 570, y: 310, rotation: 0, properties: { energized: false, changeoverContacts: 1 } },
      { id: "rest", definitionId: "generic.iec.solenoid-actuator", reference: "Y1", x: 880, y: 375, rotation: 0, properties: { energized: false, returnSpring: true } },
      { id: "timed", definitionId: "generic.iec.solenoid-actuator", reference: "Y2", x: 880, y: 515, rotation: 0, properties: { energized: false, returnSpring: true } },
    ],
    wires: [
      { id: "timer-coil", from: { componentId: "start", terminalId: "out" }, to: { componentId: "timer", terminalId: "a1" }, points: [], netName: "START_DELAY" },
      { id: "timer-common", from: { componentId: "start", terminalId: "out" }, to: { componentId: "timer", terminalId: "15" }, points: [], netName: "DELAY_COMMON" },
      { id: "relay-coil", from: { componentId: "timer", terminalId: "18" }, to: { componentId: "relay", terminalId: "a1" }, points: [], netName: "TIMED_ENABLE" },
      { id: "relay-common", from: { componentId: "signal", terminalId: "out" }, to: { componentId: "relay", terminalId: "11" }, points: [{ x: 235, y: 345 }, { x: 235, y: 255 }, { x: 540, y: 255 }], netName: "TRANSFER_SIGNAL" },
      { id: "rest-output", from: { componentId: "relay", terminalId: "12" }, to: { componentId: "rest", terminalId: "a1" }, points: [], netName: "REST_OUTPUT" },
      { id: "timed-output", from: { componentId: "relay", terminalId: "14" }, to: { componentId: "timed", terminalId: "a1" }, points: [], netName: "TIMED_OUTPUT" },
    ],
  };
  const actuatorExpectations = (transferred: boolean) => [
    { reference: "Y1", label: "Actuator position", exact: transferred ? "RETRACTED" : "EXTENDED · stroke unset" },
    { reference: "Y2", label: "Actuator position", exact: transferred ? "EXTENDED · stroke unset" : "RETRACTED" },
  ];
  const operatingSequence: NonNullable<ProjectTemplate["operatingSequence"]> = [
    { name: "Close S1 and check Y1 before timeout", durationSeconds: 1, changes: [{ reference: "S1", properties: { input: true } }], expectations: actuatorExpectations(false) },
    { name: "Keep S1 closed until K1 transfers to Y2", durationSeconds: 1.1, changes: [], expectations: actuatorExpectations(true) },
    { name: "Open S1 and check that K1 returns to Y1", durationSeconds: 0.1, changes: [{ reference: "S1", properties: { input: false } }], expectations: actuatorExpectations(false) },
  ];
  return {
    id: document.id,
    name: document.name,
    description: document.description,
    category: "Control Circuit",
    level: "Intermediate",
    document,
    expectedOutputs: [
      { reference: "K1", label: "Relay contacts", valueIncludes: "DE-ENERGIZED" },
      { reference: "Y1", label: "Actuator position", valueIncludes: "EXTENDED" },
      { reference: "Y2", label: "Actuator position", valueIncludes: "RETRACTED" },
    ],
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
  };
}
