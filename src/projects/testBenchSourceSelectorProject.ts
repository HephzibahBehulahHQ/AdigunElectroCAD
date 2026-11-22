import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createTestBenchSourceSelectorProject(): ProjectTemplate {
  const id = "plc-test-bench-source-selector";
  const name = "Test bench source command selector";
  const description = "Two wired requests select source A or B on a test bench. Simultaneous requests latch a conflict and inhibit both commands. Both requests must stay released for one simulated second before the PLC accepts a new selection. This example models command signals and excludes power switching.";
  const cases = [
    { name: "Begin with both requests released.", a: false, b: false, seconds: .1, outputA: "OFF", outputB: "OFF" },
    { name: "Request source A only.", a: true, b: false, seconds: .1, outputA: "ON", outputB: "OFF" },
    { name: "Request B while A is active. Both commands drop.", a: true, b: true, seconds: .1, outputA: "OFF", outputB: "OFF" },
    { name: "Release A while holding B. The conflict stays latched.", a: false, b: true, seconds: .3, outputA: "OFF", outputB: "OFF" },
    { name: "Release both requests for half a second.", a: false, b: false, seconds: .5, outputA: "OFF", outputB: "OFF" },
    { name: "Re-request B too early. The conflict remains latched.", a: false, b: true, seconds: .1, outputA: "OFF", outputB: "OFF" },
    { name: "Release both requests for a full second.", a: false, b: false, seconds: 1, outputA: "OFF", outputB: "OFF" },
    { name: "Request B again after the neutral interval.", a: false, b: true, seconds: .1, outputA: "OFF", outputB: "ON" },
    { name: "Request both sources again. Verify both commands are inhibited.", a: true, b: true, seconds: .1, outputA: "OFF", outputB: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, a, b, seconds, outputA, outputB }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: a } }, { reference: "S2", properties: { input: b } }],
    expectations: [
      { reference: "K1", label: "Coil", exact: outputA },
      { reference: "K2", label: "Coil", exact: outputB },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "request-a", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 220, rotation: 0, properties: { input: false } },
        { id: "request-b", definitionId: "logic.no-contact", reference: "S2", x: 165, y: 500, rotation: 0, properties: { input: false } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: [
            "LD I0; AND I1; SET M0", "LDN I0; ANDN I1; TON T0 1", "LD T0; RESET M0",
            "LD I0; ANDN I1; ANDN M0; OUT Q0", "LD I1; ANDN I0; ANDN M0; OUT Q1",
          ].join("; "),
        } },
        { id: "source-a", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "source-b", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "request-a-i0", netName: "SOURCE_A_REQUEST", from: { componentId: "request-a", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "request-b-i1", netName: "SOURCE_B_REQUEST", from: { componentId: "request-b", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-1" }, points: [] },
        { id: "source-a-q0", netName: "SOURCE_A_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "source-a", terminalId: "in" }, points: [] },
        { id: "source-b-q1", netName: "SOURCE_B_COMMAND", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "source-b", terminalId: "in" }, points: [] },
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
