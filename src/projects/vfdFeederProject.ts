import type { ProjectTemplate } from "./templateLibrary";

/** Three-phase VFD feeder with a generic, editable motor model and explicit assumptions. */
export function createVfdFeederProject(): ProjectTemplate {
  const document: ProjectTemplate["document"] = {
    id: "vfd-motor-feeder",
    name: "Three-phase VFD motor feeder",
    revision: 1,
    description: "400 V / 50 Hz three-phase source → 3-pole breaker → VFD → three-lead motor. The generic motor uses an explicit 1500 rpm ideal synchronous-speed base at 50 Hz; actual slip, drive V/Hz control, protection coordination and transients are not simulated.",
    components: [
      { id: "supply", definitionId: "generic.iec.ac-supply", reference: "X1", x: 180, y: 300, rotation: 0, properties: { nominalVoltageV: 400, frequencyHz: 50, outputEnabled: true } },
      { id: "breaker", definitionId: "generic.iec.circuit-breaker", reference: "Q1", x: 400, y: 300, rotation: 0, properties: { closed: true, poles: 3 } },
      { id: "drive", definitionId: "generic.iec.variable-frequency-drive", reference: "U1", x: 650, y: 300, rotation: 0, properties: { enabled: false, commandHz: 0, maximumFrequencyHz: 50 } },
      { id: "motor", definitionId: "generic.iec.three-phase-motor", reference: "M1", x: 900, y: 300, rotation: 0, properties: { nominalVoltageV: 400, ratedFrequencyHz: 50, nominalSpeedRpm: 1500, energized: true } },
    ],
    wires: [
      { id: "supply-l1", from: { componentId: "supply", terminalId: "l1-out" }, to: { componentId: "breaker", terminalId: "l1-in" }, points: [], netName: "L1" },
      { id: "supply-l2", from: { componentId: "supply", terminalId: "l2-out" }, to: { componentId: "breaker", terminalId: "l2-in" }, points: [], netName: "L2" },
      { id: "supply-l3", from: { componentId: "supply", terminalId: "l3-out" }, to: { componentId: "breaker", terminalId: "l3-in" }, points: [], netName: "L3" },
      { id: "breaker-l1", from: { componentId: "breaker", terminalId: "l1-out" }, to: { componentId: "drive", terminalId: "l1-in" }, points: [], netName: "L1_VFD" },
      { id: "breaker-l2", from: { componentId: "breaker", terminalId: "l2-out" }, to: { componentId: "drive", terminalId: "l2-in" }, points: [], netName: "L2_VFD" },
      { id: "breaker-l3", from: { componentId: "breaker", terminalId: "l3-out" }, to: { componentId: "drive", terminalId: "l3-in" }, points: [], netName: "L3_VFD" },
      { id: "drive-u1", from: { componentId: "drive", terminalId: "u1" }, to: { componentId: "motor", terminalId: "u1" }, points: [], netName: "U1_MOTOR" },
      { id: "drive-v1", from: { componentId: "drive", terminalId: "v1" }, to: { componentId: "motor", terminalId: "v1" }, points: [], netName: "V1_MOTOR" },
      { id: "drive-w1", from: { componentId: "drive", terminalId: "w1" }, to: { componentId: "motor", terminalId: "w1" }, points: [], netName: "W1_MOTOR" },
      { id: "pe-drive", from: { componentId: "supply", terminalId: "pe" }, to: { componentId: "drive", terminalId: "pe" }, points: [], netName: "PE" },
      { id: "pe-motor", from: { componentId: "drive", terminalId: "pe" }, to: { componentId: "motor", terminalId: "pe" }, points: [], netName: "PE" },
    ],
  };
  const operatingSequence: NonNullable<ProjectTemplate["operatingSequence"]> = [
    { name: "Enable drive at 25 Hz", durationSeconds: 0.1, changes: [{ reference: "U1", properties: { enabled: true, commandHz: 25 } }], expectations: [{ reference: "U1", label: "VFD output", exact: "25.0 Hz" }, { reference: "M1", label: "Nominal motor point", exact: "750 rpm / 0 kW" }] },
    { name: "Raise command to 50 Hz", durationSeconds: 0.1, changes: [{ reference: "U1", properties: { commandHz: 50 } }], expectations: [{ reference: "U1", label: "VFD output", exact: "50.0 Hz" }, { reference: "M1", label: "Nominal motor point", exact: "1500 rpm / 0 kW" }] },
    { name: "Disable drive", durationSeconds: 0.1, changes: [{ reference: "U1", properties: { enabled: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
  ];
  return {
    id: document.id,
    name: document.name,
    category: "Drives & Motor Control",
    level: "Intermediate",
    description: "A terminal-wired three-phase supply, 3-pole generic breaker, generic VFD and generic three-lead motor with protective earth. X1 and Q1 are editable; U1 enable and command frequency are adjustable. M1's 1500 rpm at 50 Hz base is an ideal synchronous-speed assumption, not a nameplate. Drive V/Hz control, motor slip, breaker ratings, drive protection and transients are not modeled.",
    document,
    testSequence: operatingSequence.map((step) => step.name),
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" },
      { reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED" },
      { reference: "U1", label: "VFD output", valueIncludes: "DISABLED" },
    ],
    operatingSequence,
  };
}

