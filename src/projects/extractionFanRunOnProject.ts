import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createExtractionFanRunOnProject(): ProjectTemplate {
  const id = "plc-extraction-fan-run-on";
  const name = "Extraction fan post-run timer";
  const description = "A PLC runs the extraction fan command while the process request is active, then keeps it on for two simulated seconds. A separate coil indicates the run-on interval. Opening the wired enable cancels both commands and clears the pending run-on. The drawing models control signals and timing only.";
  const enableSignal = { componentId: "enable", terminalId: "out" };
  const enableInput = { componentId: "plc", terminalId: "in-1" };
  const cases = [
    { name: "Idle with enable present.", request: false, seconds: .1, fan: "OFF", runOn: "OFF" },
    { name: "Start the process. The fan command turns on.", request: true, seconds: .1, fan: "ON", runOn: "OFF" },
    { name: "Stop the process. At one second the fan is still running.", request: false, seconds: 1, fan: "ON", runOn: "ON" },
    { name: "Restart before expiry to reset the timer.", request: true, seconds: .1, fan: "ON", runOn: "OFF" },
    { name: "Stop again. Verify a fresh run-on interval.", request: false, seconds: 1, fan: "ON", runOn: "ON" },
    { name: "Reach two seconds and verify both commands drop.", request: false, seconds: 1, fan: "OFF", runOn: "OFF" },
    { name: "Run the process again.", request: true, seconds: .1, fan: "ON", runOn: "OFF" },
    { name: "Start run-on before testing the enable wire.", request: false, seconds: .5, fan: "ON", runOn: "ON" },
    { name: "Disconnect enable. Cancel the fan and the run-on interval.", request: false, connected: false, seconds: .1, fan: "OFF", runOn: "OFF" },
    { name: "Reconnect enable with no process request. The fan stays off.", request: false, connected: true, seconds: .1, fan: "OFF", runOn: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, request, seconds, fan, runOn, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: request } }],
    wireChanges: connected === undefined ? undefined : [{ from: enableSignal, to: enableInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: fan },
      { reference: "K2", label: "Coil", exact: runOn },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "request", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 220, rotation: 0, properties: { input: false } },
        { id: "enable", definitionId: "logic.no-contact", reference: "S2", x: 165, y: 500, rotation: 0, properties: { input: true } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: [
            "LD I0; AND I1; SET M0", "LDN I1; RESET M0", "LD M0; ANDN I0; TON T0 2",
            "LD T0; RESET M0", "LD M0; OUT Q0", "LD M0; ANDN I0; OUT Q1",
          ].join("; "),
        } },
        { id: "fan-command", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "run-on-indication", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "request-i0", netName: "PROCESS_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "enable-i1", netName: "FAN_ENABLE", from: enableSignal, to: enableInput, points: [] },
        { id: "fan-q0", netName: "EXTRACTION_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "fan-command", terminalId: "in" }, points: [] },
        { id: "run-on-q1", netName: "RUN_ON_ACTIVE", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "run-on-indication", terminalId: "in" }, points: [] },
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
