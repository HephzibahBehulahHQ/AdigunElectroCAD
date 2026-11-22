import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createDuplexPumpAlternatorProject(): ProjectTemplate {
  const id = "plc-duplex-pump-alternator";
  const name = "Duplex sump pump duty alternator";
  const description = "The PLC alternates the duty pump when the demand input falls. A separate wired enable gates both outputs, so opening the enable circuit stops both commands without changing the selected duty. This example models the control signals. It has no motor power circuit or hydraulic feedback.";
  const enableSignal = { componentId: "enable", terminalId: "out" };
  const enableInput = { componentId: "plc", terminalId: "in-1" };
  const cases = [
    { name: "Idle with the enable closed.", demand: false, a: "OFF", b: "OFF" },
    { name: "First demand selects pump A.", demand: true, a: "ON", b: "OFF" },
    { name: "Hold demand across scans. Pump A remains selected.", demand: true, a: "ON", b: "OFF" },
    { name: "Demand clears. Both commands stop.", demand: false, a: "OFF", b: "OFF" },
    { name: "Next demand selects pump B.", demand: true, a: "OFF", b: "ON" },
    { name: "Open the enable wire while demand is present.", demand: true, connected: false, a: "OFF", b: "OFF" },
    { name: "Restore the enable wire. Pump B remains the assigned duty.", demand: true, connected: true, a: "OFF", b: "ON" },
    { name: "Clear demand to end the second cycle.", demand: false, a: "OFF", b: "OFF" },
    { name: "Third demand returns to pump A.", demand: true, a: "ON", b: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, demand, connected, a, b }): CircuitSequenceStep => ({
    name,
    durationSeconds: .2,
    changes: [{ reference: "S1", properties: { input: demand } }],
    wireChanges: connected === undefined ? undefined : [{ from: enableSignal, to: enableInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: a },
      { reference: "K2", label: "Coil", exact: b },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "demand", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 220, rotation: 0, properties: { input: false } },
        { id: "enable", definitionId: "logic.no-contact", reference: "S2", x: 165, y: 500, rotation: 0, properties: { input: true } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LD M1; ANDN I0; XOR M0; OUT M0; LD I0; OUT M1; LD I0; AND I1; ANDN M0; OUT Q0; LD I0; AND I1; AND M0; OUT Q1",
        } },
        { id: "pump-a-command", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "pump-b-command", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "demand-i0", netName: "PUMP_DEMAND", from: { componentId: "demand", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "enable-i1", netName: "PUMP_ENABLE", from: enableSignal, to: enableInput, points: [] },
        { id: "pump-a-q0", netName: "PUMP_A_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "pump-a-command", terminalId: "in" }, points: [] },
        { id: "pump-b-q1", netName: "PUMP_B_COMMAND", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "pump-b-command", terminalId: "in" }, points: [] },
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
