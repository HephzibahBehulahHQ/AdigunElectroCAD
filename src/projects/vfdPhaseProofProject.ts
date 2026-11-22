import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";
import type { Wire } from "../types/electrical";

export function createVfdPhaseProofProject(): ProjectTemplate {
  const id = "vfd-input-output-phase-proof";
  const name = "VFD input and output phase proof";
  const description = "One phase monitor taps the VFD input and another taps its output. With the drive disabled, only the input monitor reports healthy phases. Enabling the drive establishes output phase proof. Removing an input phase drops both indications. This example models nominal phase paths rather than output waveforms.";
  const phaseLead = { from: { componentId: "supply", terminalId: "l3-out" }, to: { componentId: "drive", terminalId: "l3-in" } };
  const cases = [
    { name: "With supply present and drive disabled, verify input phases only.", enabled: false, frequency: 25, input: true, output: false },
    { name: "Enable the drive at 25 Hz. Verify both phase indications.", enabled: true, frequency: 25, input: true, output: true },
    { name: "Raise the command to 50 Hz. Keep both phase indications.", enabled: true, frequency: 50, input: true, output: true },
    { name: "Open the L3 input conductor. Input and output proof both drop.", enabled: true, frequency: 50, input: false, output: false, connected: false },
    { name: "Disable the drive before reconnecting. Restore input proof only.", enabled: false, frequency: 50, input: true, output: false, connected: true },
    { name: "Re-enable the drive and verify output proof returns.", enabled: true, frequency: 50, input: true, output: true },
  ];
  const operatingSequence = cases.map(({ name, enabled, frequency, input, output, connected }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "U1", properties: { enabled, commandHz: frequency } }],
    wireChanges: connected === undefined ? undefined : [{ ...phaseLead, connected }],
    expectations: [
      { reference: "PF1", label: "Phase monitor", exact: input ? "HEALTHY" : "FAILED" },
      { reference: "PF2", label: "Phase monitor", exact: output ? "HEALTHY" : "FAILED" },
    ],
  }));
  const wires: Wire[] = ["l1", "l2", "l3"].flatMap((phase, index) => {
    const driveInput = { componentId: "drive", terminalId: phase + "-in" };
    return [
      { id: "feed-" + phase, netName: phase.toUpperCase(), from: { componentId: "supply", terminalId: phase + "-out" }, to: driveInput, points: [] },
      { id: "input-proof-" + phase, netName: phase.toUpperCase(), from: driveInput, to: { componentId: "input-monitor", terminalId: phase }, points: [] },
      { id: "output-proof-" + phase, netName: "DRIVE_" + phase.toUpperCase(), from: { componentId: "drive", terminalId: ["u1", "v1", "w1"][index] }, to: { componentId: "output-monitor", terminalId: phase }, points: [] },
    ];
  });
  wires.push({ id: "drive-pe", netName: "PE", from: { componentId: "supply", terminalId: "pe" }, to: { componentId: "drive", terminalId: "pe" }, points: [] });
  return {
    id, name, description, category: "Drives & Motor Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "supply", definitionId: "iec.ac-supply.01", reference: "X1", x: 520, y: 155, rotation: 0, properties: { outputEnabled: true, nominalVoltageV: 400, frequencyHz: 50 } },
        { id: "drive", definitionId: "generic.iec.variable-frequency-drive", reference: "U1", x: 520, y: 370, rotation: 0, properties: { enabled: false, commandHz: 25, maximumFrequencyHz: 50 } },
        { id: "input-monitor", definitionId: "safety.phase-failure", reference: "PF1", x: 240, y: 535, rotation: 0, properties: { requireWiredPhases: true } },
        { id: "output-monitor", definitionId: "safety.phase-failure", reference: "PF2", x: 800, y: 535, rotation: 0, properties: { requireWiredPhases: true } },
      ],
      wires,
    },
    operatingSequence,
    testSequence: operatingSequence.map(({ name }) => name),
    expectedOutputs: [
      { reference: "U1", label: "VFD output", valueIncludes: "DISABLED" },
      { reference: "PF1", label: "Phase monitor", valueIncludes: "HEALTHY" },
      { reference: "PF2", label: "Phase monitor", valueIncludes: "FAILED" },
    ],
  };
}
